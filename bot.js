(function () {
'use strict';

var irc = require('irc'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    path = require('path'),
    moduleMan = require("./node-module-manager");


var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var bot = {};

bot.util = {}; //Util functions

/* splits a string into parts respecting
 * quote marks and escaped quotes
 *
 * Example:
 *   quotedSplit('"arg 1" arg\ 2 "arg\\"3\\""') -> ['arg 1', 'arg 2', 'arg"3"']
 */
bot.util.quotedSplit = function(str) {
  var res = [];
  var currentStr = '';
  var inQuotes = false;
  for(var i=0;i<str.length;i++) {
    if(inQuotes && str[i] === '"') {
      res.push(currentStr);
      inQuotes = false;
      currentStr = '';
    } else if(str[i] === '"' && !inQuotes) {
      inQuotes = true;
      if(currentStr !== '') res.push(currentStr);
      currentStr = '';
    } else if(str[i] === ' ' && !inQuotes) {
      if(currentStr !== '') res.push(currentStr);
      currentStr = '';
    } else if(str[i] === "\\") {
      i++;
      currentStr += str[i];
    } else {
      currentStr += str[i];
    }
  }
  if(currentStr !== '') res.push(currentStr);
  return res;
};

bot.init = function(cb) {
  bot.configfolder = bot.config.configfolder;
  bot.tmpfolder = bot.config.tmpfolder;
  bot.datafolder = bot.config.datafolder;
  _.each(['configfolder', 'tmpfolder', 'datafolder'],function(i) {
    if(!fs.existsSync("./"+bot[i])) {
      fs.mkdirSync("./"+bot[i]);
    }
  });
  cb(null);
};

bot.initModuleManager = function(cb) {
  moduleMan.init(bot, cb);
};

var supportedConfigTypes = [
  {
    exts: [".json"],
    test: null, //TODO
    parse: function(data, loc, cb) {
      try {
        cb(null, JSON.parse(data));
      } catch(ex) {
        cb(ex);
      }
    },
  },
  {
    exts: ['.js'],
    test: null,
    parse: function(data, loc, cb) {
      try {
        cb(null, require(loc));
      } catch(ex) {
        cb(ex);
      }
    }
  }
];

bot.getConfig = function(name, cb) {
  var fullPath = path.join(bot.config.configfolder, name);
  var done = false;
  fs.readFile(fullPath,{encoding: 'utf8'}, function(err, res) {
    if(err) return cb(err);

    var ext = path.extname(fullPath);
    supportedConfigTypes.forEach(function(type) {
      if(_.any(type.exts, function(e) { return e === ext; })) {
        type.parse(res, fullPath, cb);
        done = true;
        return false;
      }
    });
    if(!done) return cb(null, res);
  });
};

bot.getDataFolder = function(namespace) {
  return path.join(bot.datafolder, namespace);
};


bot.callModuleFn = function(fname, args) {
  return moduleMan.callModuleFn(fname, args);
};


bot.callCommandFn = function(command, args) {
  return moduleMan.callCommandFn(command, args);
};


bot.loadConfig = function(cb) { //sync
  var conf;
  try {
    var default_config = JSON.parse(fs.readFileSync("./config.example.json"));
    conf = JSON.parse(fs.readFileSync('./config.json'));
    var def_keys = Object.keys(default_config);
    _.each(default_config, function(value, key) {
      if(typeof conf[key] === 'undefined') {
        console.log("Setting: ", key, " to ", value);
        conf[key] = value;
      }
    });
  } catch(e) {
    console.log("Error reading config:", e);
    conf = default_config;
  }
  return conf;
};


bot.initClient = function(cb) {
  var conf = bot.config;
  bot.client = new irc.Client(conf.server, conf.nick, {
    userName: conf.userName,
    password: conf.password,
    realName: conf.realName,
    port: conf.port,
    debug: conf.debug,
    showErrors: conf.showErrors,
    autoRejoin: true,
    autoConnect: false,
    channels: [],
    secure: conf.ssl,
    selfSigned: true,
    floodProtection: false,
    channelPrefixes: conf.channelPrefixes,
    messageSplit: conf.messageSplit
  });
  bot.client.on('error', function(err) { console.log(err);});


  bot.client.on('join', function(channel, nick, raw) {
    bot.callModuleFn('join', [channel, nick, raw]);
  });
  bot.client.on('part', function(channel, nick, raw) {
    bot.callModuleFn('part', [channel, nick, raw]);
  });
  bot.client.on('quit', function(nick,reason,channels,raw) {
    bot.callModuleFn('quit', [nick, reason, channels, raw]);
  });


  bot.client.on('notice', function(from, to, text, raw) {
    var primaryFrom = (to == bot.client.nick) ? from : to;

    bot.callModuleFn('notice', [text, from, to, bot.getNoticeReply(primaryFrom), raw]);
    if(to == bot.client.nick) {
      bot.callModuleFn('pmnotice', [text, from, bot.getNoticeReply(primaryFrom), raw]);
    } else {
      bot.callModuleFn('channotice', [text, to, from, bot.getNoticeReply(primaryFrom), raw]);
    }

  });

  bot.client.on('message', function(from, to, text, raw) {
    var primaryFrom = (to == bot.client.nick) ? from : to;
    bot.callModuleFn('message', [text, from, to, bot.getReply(primaryFrom), raw]);

    bot.callModuleFn('msg', [text, from, bot.getReply(primaryFrom), raw]);

    if(to == bot.client.nick) {
      bot.callModuleFn('pm', [text, from, bot.getReply(from), raw]);
    } else {
      bot.callModuleFn('chanmsg', [text, to, from, bot.getReply(to), raw]);
    }
    if(text.substring(0, bot.config.commandPrefix.length) == bot.config.commandPrefix) {
      var re = new RegExp('^' + reEscape(bot.config.commandPrefix) + '(\\S*)\\s*(.*)$', 'g');
      var rem = re.exec(text);
      var command = rem[1];
      var remainder = rem.length == 3 ? rem[2] : "";
      var respTo = (bot.client.nick == to) ? from : to;

      bot.callModuleFn("any_command", [remainder, bot.util.quotedSplit(remainder), bot.getReply(respTo), command, from, to, text, raw]);
      bot.callCommandFn(command, [remainder, bot.util.quotedSplit(remainder), bot.getReply(respTo), command, from, to, text, raw]);
    }
  });

  bot.client.on('ctcp', function(from, to, text, type, raw) {
    if(from == bot.config.owner && to == bot.client.nick && text == "RELOAD") {
      moduleMan.reloadModules();
    } else if(from == bot.config.owner && to == bot.client.nick && text == "LOAD") {
      moduleMan.loadModules();
    } else {
      moduleMan.callModuleFn('ctcp', [text, type, from, to, raw]);
    }

    if(raw.args && raw.args[1] && /^\u0001ACTION.*\u0001$/.test(raw.args[1])) {
      if(/^ACTION /.test(text)) text = text.substring("ACTION ".length);

      var primaryFrom = (to == bot.client.nick) ? from : to;
      moduleMan.callModuleFn('action', [text, from, to, bot.getActionReply(primaryFrom), raw]);
      if(to == bot.client.nick) {
        moduleMan.callModuleFn('pmaction', [text, from, bot.getActionReply(primaryFrom), raw]);
      } else {
        moduleMan.callModuleFn('chanaction', [text, to, from, bot.getActionReply(primaryFrom), raw]);
      }
    }
  });

  bot.client.on('ping', function() {
    bot.lastPing = (new Date).getTime();
  } );

  cb();
};

bot.sayTo = function(target, args) {
  // Todo, make this use stringifyArgs.
  var tosay = [];
  for(var i=1;i<arguments.length;i++) {
    tosay.push(arguments[i]);
  }
  bot.client.say(target, tosay.join(' '));
};
/* say("one", "two") => "one two" */
bot.say = function(args) {
  var tosay = [];
  for(var i=0;i<arguments.length;i++) {
    tosay.push(arguments[i]);
  }
  bot.client.say(bot.config.mainChannel, tosay.join(' '));
};

bot.joinChannels = function(cb) {
  if(!cb) cb = function(err) { if(err) console.log(err); };

  var channels = Array.isArray(bot.conf.channels) ? bot.conf.channels : bot.conf.channels.split(',');
  async.map(channels, function(item, joined) {
    bot.client.join(item, function(){joined();});
  }, cb);
};

bot.stringifyArgs = function(args) {
  var strParts = [];
  for(var i=0;i<arguments.length;i++) {
    if(typeof arguments[i] === 'string') {
      strParts.push(arguments[i]);
    } else if(Array.isArray(arguments[i])) {
      strParts.push(bot.stringifyArgs.apply(this, arguments[i]));
    } else if(arguments[i] === undefined || arguments[i] === null) {
      strParts.push('');
    } else{
      strParts.push(arguments[i].toString());
    }
  }
  return strParts.join(' ');
};

bot.isChannel = function(name) {
  return _.some(_.map(bot.config.channelPrefixes.split(''), function(el) { return name[0] == el; }));
};


bot.getReply = function(chan) {
  return function(args) {
    var repStr = bot.stringifyArgs.apply(this, arguments);
    if(bot.isChannel(chan)) {
      bot.callModuleFn('chansay', [bot.client.nick, chan, repStr]);
    } else {
      bot.callModuleFn('pmsay', [bot.client.nick, chan, repStr]);
    }
    bot.client.say(chan, repStr);
  };
};

bot.getNoticeReply = function(to) {
  return function(args) {
    var repStr = bot.stringifyArgs.apply(this, arguments);

    if(bot.isChannel(chan)) {
      bot.callModuleFn('channotice', [bot.client.nick, to, repStr]);
    } else {
      bot.callModuleFn('pmnotice', [bot.client.nick, to, repStr]);
    }
    bot.client.notice(to, repStr);
  };
};
bot.getActionReply = function(to) {
  return function(args) {
    var repStr = bot.stringifyArgs.apply(this, arguments);

    if(bot.isChannel(chan)) {
      bot.callModuleFn('channotice', [bot.client.nick, to, repStr]);
    } else {
      bot.callModuleFn('pmnotice', [bot.client.nick, to, repStr]);
    }
    bot.client.action(to, repStr);
  };
};

bot.createPathIfNeeded = function(fullPath, cb) {
  var dirname = path.dirname(fullPath);
  fs.mkdir(dirname, function(err) {
    if(err && err.code != 'EEXIST') {
      // Directory doesn't already exist and couldn't be made
      cb(err);
    } else {
      // Made or already exists.
      cb(null);
    }
  });
};

bot.fsStoreData = function(namespace, filePath, data, flag, cb) {
  // Flags is an optional argument
  if(typeof flag == 'function') {
    cb = flag;
    flag = 'w';
  }

  var basePath = bot.getDataFolder(namespace);
  var finalPath = path.join(basePath, filePath);

  bot.createPathIfNeeded(finalPath, function(err, res) {
    if(err) return cb(err);
    fs.writeFile(finalPath, data, {flag: flag}, cb);
  });
};

bot.fsGetData = function(namespace, filePath, cb) {
  var basePath = bot.getDataFolder(namespace);
  var finalPath = path.join(basePath, filePath);

  fs.readFile(finalPath, cb);
};

bot.fsListData = function(namespace, listPath, cb) {
  var basePath = bot.getDataFolder(namespace);
  var finalPath = path.join(basePath, listPath);

  fs.readdir(finalPath, cb);
};

bot.pingCheck = function() {
  if(bot.lastPing + bot.conf.timeout > (new Date).getTime())
    return;

  console.log("Reconnecting");
  bot.client.disconnect( );
  bot.lastPing += bot.conf.timeout;
  console.log("Last ping: ")
  console.log(bot.lastPing);
  bot.client.connect( );
  bot.joinChannels( );
};

async.series([
  function(cb) {
    bot.conf = bot.config = bot.loadConfig();
    cb(null);
  },
  bot.initClient,
  bot.init,
  function(cb){
    bot.client.connect(function(){cb(null);});
  },
  function(cb){
    console.log("Connected!");
    cb(null);
  },
  bot.initModuleManager,
  moduleMan.loadModules,
  bot.joinChannels,
  function(cb) {
    bot.conf.timeout *= 1000;
    bot.lastPing = (new Date).getTime() + bot.config.timeout;
    setInterval( bot.pingCheck, 5000 );
  },
], function(err, results) {
  if(err) {
    console.trace("Error in init");
    console.log(err);
  }
});

}());
