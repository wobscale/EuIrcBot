(function () {
'use strict';

var irc = require('irc'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    path = require('path'),
    moduleMan = require("./node-module-manager"),
    changeCase = require('change-case'),
    SnailEscape = require('snailescape.js');


var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var bot = {};

bot.util = {}; //Util functions

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
  var default_config = JSON.parse(fs.readFileSync("./config.example.json"));
  try {
    conf = JSON.parse(fs.readFileSync('./config.json'));
  } catch(ex) {
    console.log("Error reading config file: ", e);
    conf = default_config;
  }

  _.each(default_config, function(value, key) {
    var envKey = changeCase.constantCase(key);
    // Load environment variable approximations of each config key and let them override
    if(typeof process.env[envKey] !== 'undefined') {
      try {
        conf[key] = JSON.parse(process.env[envKey]);
      } catch(ex) {
        console.log("Could not load key: " + envKey + " because it was not valid json");
      }
    }
  });

  var def_keys = Object.keys(default_config);
  _.each(default_config, function(value, key) {
    if(typeof conf[key] === 'undefined') {
      console.log("Setting: ", key, " to ", value);
      conf[key] = value;
    }
  });
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

  var quoteSplit = new SnailEscape();

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

      var parts = quoteSplit.parse(remainder).parts || remainder.split(" ");
      bot.callModuleFn("any_command", [remainder, parts, bot.getReply(respTo), command, from, to, text, raw]);
      bot.callCommandFn(command, [remainder, parts, bot.getReply(respTo), command, from, to, text, raw]);
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
  });

  bot.client.on('ping', function() {
    bot.lastPing = (new Date()).getTime();
  } );

  bot.client.on('action', function(from, to, text, type, raw) {
    var primaryFrom = (to == bot.client.nick) ? from : to;
    moduleMan.callModuleFn('action', [text, from, to, bot.getActionReply(primaryFrom), raw]);
    if(to == bot.client.nick) {
      moduleMan.callModuleFn('pmaction', [text, from, bot.getActionReply(primaryFrom), raw]);
    } else {
      moduleMan.callModuleFn('chanaction', [text, to, from, bot.getActionReply(primaryFrom), raw]);
    }
  });

  // This is emitted by the client right before it tries to say something.
  // Note, this will not work if we send notices or certain other events,
  // but that won't happen in practice yet
  bot.client.on('selfMessage', function(to, text) {
    // Hack! This ensures that even though node-irc calls this as part of the same function path, the events for pmsay/chansay happen a tick later.
    // To understand why this matters, see issue
    // https://github.com/euank/EuIrcBot/issues/131.
    //
    // This also makes sense if we envision the call stack for a message if we
    // have mod1, which does a reply on 'foo', and mod2, which records all
    // 'pmsay' and all 'msg' events.
    //
    // callModuleFn(msg, foo) // triggers mod1 and mod2
    //   -> mod1.onmsg(foo)
    //     -> reply(bar)
    //       -> bot.client.say(bar)
    //         -> bot.client.emit(selfMessage)
    //           -> mod2.onpmsay(bar) // mod2.onpmsay is triggered and records "bar"
    //           -> ...
    //   -> mod2.onmsg(foo) // mod2.onmsg records "foo"
    //    
    //
    // The problem with the above is that mod2 has a wrong state of the world
    // in that it recorded "bar" as being said before receiving the message
    // "foo". This is obviously wrong.
    // The easy and sorta hacky fix for this is simply ensuring that all
    // 'onpmsay' events are triggered after the current eventloop finishes
    // processing, since that ensures that if the 'onmsg' handler of bar
    // records the message in the same tick it was called, it will retain a
    // correct ordering.
    process.nextTick(function() {
      if(bot.isChannel(to)) {
        bot.callModuleFn('chansay', [bot.client.nick, to, text]);
      } else {
        bot.callModuleFn('pmsay', [bot.client.nick, to, text]);
      }
    });
  });

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

  console.log("Probably lost connection, terminating process.");
  bot.client.disconnect();
  process.exit(1);
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
