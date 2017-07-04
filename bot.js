(function () {
'use strict';

var irc = require('irc'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    path = require('path'),
    moduleMan = require("./node-module-manager"),
    changeCase = require('change-case'),
    SnailEscape = require('snailescape.js'),
    bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "euircbot",
  serializers: {err: bunyan.stdSerializers.err},
});

var heapdump = null;

var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var bot = {};

bot.util = {}; //Util functions

bot.init = function(cb) {
  if(bot.config.heapdump) {
    log.debug("enabling heap dumps");
    heapdump = require('heapdump');
    process.on('SIGINT', function() {
      log.warn("dumping heap, if configured, and exiting");
      bot.dump();
      process.exit();
    });
  }
  bot.configfolder = bot.config.configfolder;
  bot.tmpfolder = bot.config.tmpfolder;
  bot.datafolder = bot.config.datafolder;
  _.each(['configfolder', 'tmpfolder', 'datafolder'],function(i) {
    if(!fs.existsSync("./"+bot[i])) {
      fs.mkdirSync("./"+bot[i]);
    }
  });
  log.level(bot.config.logLevel);
  cb(null);
};

bot.initModuleManager = function(cb) {
  moduleMan.init(bot, log, cb);
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
    log.error(e, "error reading config file");
    conf = default_config;
  }

  _.each(default_config, function(value, key) {
    var envKey = changeCase.constantCase(key);
    // Load environment variable approximations of each config key and let them override
    if(typeof process.env[envKey] !== 'undefined') {
      try {
        conf[key] = JSON.parse(process.env[envKey]);
      } catch(ex) {
        log.error("could not load env config '%s' because it was not valid json", envKey);
      }
    }
  });

  var def_keys = Object.keys(default_config);
  _.each(default_config, function(value, key) {
    if(typeof conf[key] === 'undefined') {
      log.debug("defaulting %s=%s", key, value);
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

  bot.client.on('error', function(err) { 
    log.error(err, "irc client error");
  });


  bot.client.on('join', function(channel, nick, raw) {
    log.trace({channel: channel, nick: nick, raw: raw, event: "join"});
    bot.callModuleFn('join', [channel, nick, raw]);
  });
  bot.client.on('part', function(channel, nick, raw) {
    log.trace({channel: channel, nick: nick, raw: raw, event: "part"});
    bot.callModuleFn('part', [channel, nick, raw]);
  });
  bot.client.on('quit', function(nick,reason,channels,raw) {
    log.trace({channel: channel, nick: nick, reason: reason, raw: raw, event: "quit"});
    bot.callModuleFn('quit', [nick, reason, channels, raw]);
  });


  bot.client.on('notice', function(from, to, text, raw) {
    log.trace({from: from, to: to, text: text, raw: raw, event: "notice"});
    var isPm = (to == bot.client.nick);
    var replyTo = isPm ? from : to;
    var replyFn = bot.getReply(replyTo, isPm, from);

    bot.callModuleFn('notice', [text, from, to, replyFn, raw]);
    if(isPm) {
      bot.callModuleFn('pmnotice', [text, from, replyFn, raw]);
    } else {
      bot.callModuleFn('channotice', [text, to, from, replyFn, raw]);
    }
  });

  bot.client.on('message', function(from, to, text, raw) {
    log.trace({from: from, to: to, text: text, raw: raw, event: "message"});
    var isPm = (to == bot.client.nick);
    var replyTo = isPm ? from : to;
    var replyFn = bot.getReply(replyTo, isPm, from);

    bot.callModuleFn('message', [text, from, to, replyFn, raw]);

    bot.callModuleFn('msg', [text, from, replyFn, raw]);

    if(isPm) {
      bot.callModuleFn('pm', [text, from, replyFn, raw]);
    } else {
      bot.callModuleFn('chanmsg', [text, to, from, replyFn, raw]);
    }

    if(text.substring(0, bot.config.commandPrefix.length) == bot.config.commandPrefix) {
      var re = new RegExp('^' + reEscape(bot.config.commandPrefix) + '(\\S*)\\s*(.*)$', 'g');
      var rem = re.exec(text);
      var command = rem[1];
      var remainder = rem.length == 3 ? rem[2] : "";
      var respTo = (bot.client.nick == to) ? from : to;

      var parts = quoteSplit.parse(remainder).parts || remainder.split(" ");
      bot.callModuleFn("any_command", [remainder, parts, replyFn, command, from, to, text, raw]);
      bot.callCommandFn(command, [remainder, parts, replyFn, command, from, to, text, raw]);
    }
  });

  bot.client.on('ctcp', function(from, to, text, type, raw) {
    log.trace({from: from, to: to, text: text, type: type, raw: raw, event: "ctcp"});
    if(from == bot.config.owner && to == bot.client.nick && text == "RELOAD") {
      moduleMan.reloadModules();
    } else if(from == bot.config.owner && to == bot.client.nick && text == "LOAD") {
      moduleMan.loadModules();
    } else {
      moduleMan.callModuleFn('ctcp', [text, type, from, to, raw]);
    }
  });

  bot.client.on('action', function(from, to, text, type, raw) {
    log.trace({from: from, to: to, text: text, type: type, raw: raw, event: "action"});
    var isPm = (to == bot.client.nick);
    var replyTo = isPm ? from : to;
    var replyFn = bot.getReply(replyTo, isPm, from);

    moduleMan.callModuleFn('action', [text, from, to, replyFn, raw]);
    if(isPm) {
      moduleMan.callModuleFn('pmaction', [text, from, replyFn, raw]);
    } else {
      moduleMan.callModuleFn('chanaction', [text, to, from, replyFn, raw]);
    }
  });

  // This is emitted by the client right before it tries to say something.
  // Note, this will not work if we send notices or certain other events,
  // but that won't happen in practice yet
  bot.client.on('selfMessage', function(to, text) {
    log.trace({to: to, text: text, event: "selfMessage"});
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
  if(!cb) cb = function(err) {
    if(err) log.error(err);
  };

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


bot.getReply = function(to, isPm, pmTarget) {
  var spamReply = function(args) {
    var repStr = bot.stringifyArgs.apply(this, arguments);
    bot.client.say(to, repStr);
  };

  // custom reply takes options of the following:
  // {
  //   trim: true, // trim spaces, leading and trailing
  //   lines: 2, // number of lines to spam
  //   replaceNewLines: false, // whether to replace newlines with | while figuring out if it'll spam
  //   pmExtra: false, // whether to PM the whole message if it overflows
  // }
  var customReply = function(opts, args) {
    // Note, this value is based on what our client does (https://github.com/martynsmith/node-irc/blob/e4000b7a8ac42d9eb16fb6c3f362e1425d664f4b/lib/irc.js#L1069), which may differ from the reality of what a given irc server enforces.
    //
    var maxLineChars = Math.min(bot.client.maxLineLength - to.length, 
                                bot.client.opt.messageSplit);

    args = Array.prototype.slice.call(arguments, 1);

    // If it's a pm, all options get ignored
    if(isPm) {
      spamReply.apply(this, args);
    }

    // Since this is a message to a channel, we're going to now apply 'custom'
    // logic to it.
    // First, get the string representation which the module requested to send.
    var repStr = bot.stringifyArgs.apply(this, args);
    // Trim it if requested
    if(opts.trim) {
      repStr = repStr.trim();
    }
    // Figure out the number of lines this would span, taking into account too-long lines splitting across lines.
    var lines = repStr.split("\n");
    var numLines = lines.length;
    for(var i = 0; i < lines.length; i++) {
      if(lines[i].length > maxLineChars) {
        // we'd split this line across multiple when we spoke it
        // note, `- 1` since numLines above already counted this once, so we
        // just need the extra after that first.
        numLines += Math.ceil(lines[i].length / maxLineChars) - 1;
      }
    }

    // If it fits in the max lines allowed, we don't have to modify anything
    if(numLines <= opts.lines) {
      // Cool, we can just say it raw and be done with it.
      bot.client.say(to, repStr);
      return;
    }

    // If replaceNewlines is set, we see if ignoring '\n' and joining stuff with '|' fixes it.
    if(opts.replaceNewlines) {
      var withoutNewlines = repStr.split("\n").join(" | ");
      if(withoutNewlines.length <= (maxLineChars * opts.lines)) {
        // Stripping was enough, we're done
        bot.client.say(to, withoutNewlines);
        return;
      }

      // This isn't fitting, say a stripped version
      bot.client.say(withoutNewlines.substring(0, maxLineChars - 3) + "...");
      // don't return, we might have to spit out extra
    } else {
      // we know it doesn't fit like this already, let's say a trimmed down version.
      var toSay = "";
      for(var i=0; i < lines.length; i++) {
        if(i == (opts.lines - 1)) {
          toSay += lines[i].substring(0, maxLineChars-4) + " ...";
          break;
        }
        toSay += lines[i].substring(0, maxLineChars) + "\n";
      }
      bot.client.say(to, toSay);
    }

    if(opts.pmExtra) {
      bot.client.say(pmTarget, repStr);
    }
  };

  var reply = function(args) {
    if(isPm) {
      spamReply.apply(this, arguments);
      return;
    }
    // Default to not spam if it's not a pm
    args = Array.prototype.slice.call(arguments);
    args.unshift({lines: 2, replaceNewLines: false, pmExtra: false, trim: true});
    customReply.apply(this, args);
  };

  // Allow callers to do things like 'reply.spam' and 'reply.custom'
  reply.spam = spamReply;
  reply.custom = customReply;

  return reply;
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

bot.dump = function() {
  if(heapdump) {
    heapdump.writeSnapshot(function(err, filename) {
      log.warn('heapdump written to', filename);
    });
  } else {
    log.trace("dump called, but heapdump off");
  }
};

async.series([
  function(cb) {
    bot.conf = bot.config = bot.loadConfig();
    log.trace("loaded config");
    cb(null);
  },
  bot.initClient,
  bot.init,
  function(cb){
    bot.client.connect(function(){cb(null);});
  },
  function(cb){
    log.info("connected!");
    cb(null);
  },
  bot.initModuleManager,
  moduleMan.loadModules,
  bot.joinChannels,
  function(cb) {
    bot.dump();
  },
], function(err, results) {
  if(err) {
    bot.dump();
    log.fatal("error in init");
    log.error(err);
  }
});

}());
