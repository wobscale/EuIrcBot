const irc = require('irc');
const fs = require('fs');
const _ = require('underscore');
const async = require('async');
const path = require('path');
const moduleMan = require('./node-module-manager');
const changeCase = require('change-case');
const SnailEscape = require('snailescape.js');
const bunyan = require('bunyan');

let heapdump = null;

const log = bunyan.createLogger({
  name: 'euircbot',
  serializers: { err: bunyan.stdSerializers.err },
});

const reEscape = function reEscape(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const bot = {};

bot.util = {}; // Util functions

bot.init = function botInit(cb) {
  if (bot.config.heapdump) {
    log.debug('enabling heap dumps');
    heapdump = require('heapdump');
    process.on('SIGINT', () => {
      log.warn('dumping heap, if configured, and exiting');
      bot.dump();
      process.exit();
    });
  }
  bot.configfolder = bot.config.configfolder;
  bot.tmpfolder = bot.config.tmpfolder;
  bot.datafolder = bot.config.datafolder;
  _.each(['configfolder', 'tmpfolder', 'datafolder'], (i) => {
    if (!fs.existsSync(`./${bot[i]}`)) {
      fs.mkdirSync(`./${bot[i]}`);
    }
  });
  log.level(bot.config.logLevel);
  cb(null);
};

bot.initModuleManager = function botInitModuleManager(cb) {
  moduleMan.init(bot, log, cb);
};

const supportedConfigTypes = [
  {
    exts: ['.json'],
    test: null, // TODO
    parse(data, loc, cb) {
      try {
        cb(null, JSON.parse(data));
      } catch (ex) {
        cb(ex);
      }
    },
  },
  {
    exts: ['.js'],
    test: null,
    parse(data, loc, cb) {
      try {
        cb(null, require(loc));
      } catch (ex) {
        cb(ex);
      }
    },
  },
];

bot.getConfig = function botGetConfig(name, cb) {
  const fullPath = path.join(bot.config.configfolder, name);
  let done = false;
  fs.readFile(fullPath, { encoding: 'utf8' }, (err, res) => {
    if (err) return cb(err);

    const ext = path.extname(fullPath);
    supportedConfigTypes.forEach((type) => {
      if (_.any(type.exts, e => e === ext)) {
        type.parse(res, fullPath, cb);
        done = true;
        return false;
      }
      return true;
    });
    if (!done) cb(null, res);
    return null;
  });
};

bot.getDataFolder = function botGetDataFolder(namespace) {
  return path.join(bot.datafolder, namespace);
};


bot.callModuleFn = function botCallModuleFn(fname, args) {
  return moduleMan.callModuleFn(fname, args);
};


bot.callCommandFn = function botCallCommandFn(command, args) {
  return moduleMan.callCommandFn(command, args);
};


bot.loadConfig = function botLoadConfig() { // sync
  let conf;
  const defaultConfig = JSON.parse(fs.readFileSync('./config.example.json'));
  try {
    conf = JSON.parse(fs.readFileSync('./config.json'));
  } catch (ex) {
    log.error(ex, 'error reading config file');
    conf = defaultConfig;
  }

  _.each(defaultConfig, (value, key) => {
    const envKey = changeCase.constantCase(key);
    // Load environment variable approximations of each config key and let them override
    if (typeof process.env[envKey] !== 'undefined') {
      try {
        conf[key] = JSON.parse(process.env[envKey]);
      } catch (ex) {
        log.error("could not load env config '%s' because it was not valid json", envKey);
      }
    }
  });

  _.each(defaultConfig, (value, key) => {
    if (typeof conf[key] === 'undefined') {
      log.debug('defaulting %s=%s', key, value);
      conf[key] = value;
    }
  });
  return conf;
};


bot.initClient = function botInitClient(cb) {
  const conf = bot.config;
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
    messageSplit: conf.messageSplit,
  });

  const quoteSplit = new SnailEscape();

  bot.client.on('error', (err) => {
    log.error(err, 'irc client error');
  });


  bot.client.on('join', (channel, nick, raw) => {
    log.trace({
      channel, nick, raw, event: 'join',
    });
    bot.callModuleFn('join', [channel, nick, raw]);
  });
  bot.client.on('part', (channel, nick, raw) => {
    log.trace({
      channel, nick, raw, event: 'part',
    });
    bot.callModuleFn('part', [channel, nick, raw]);
  });
  bot.client.on('quit', (nick, reason, channels, raw) => {
    log.trace({
      channels, nick, reason, raw, event: 'quit',
    });
    bot.callModuleFn('quit', [nick, reason, channels, raw]);
  });


  bot.client.on('notice', (from, to, text, raw) => {
    log.trace({
      from, to, text, raw, event: 'notice',
    });
    const isPm = (to === bot.client.nick);
    const replyTo = isPm ? from : to;
    const replyFn = bot.getReply(replyTo, isPm, from);

    bot.callModuleFn('notice', [text, from, to, replyFn, raw]);
    if (isPm) {
      bot.callModuleFn('pmnotice', [text, from, replyFn, raw]);
    } else {
      bot.callModuleFn('channotice', [text, to, from, replyFn, raw]);
    }
  });

  bot.client.on('message', (from, to, text, raw) => {
    log.trace({
      from, to, text, raw, event: 'message',
    });
    const isPm = (to === bot.client.nick);
    const replyTo = isPm ? from : to;
    const replyFn = bot.getReply(replyTo, isPm, from);

    bot.callModuleFn('message', [text, from, to, replyFn, raw]);

    bot.callModuleFn('msg', [text, from, replyFn, raw]);

    if (isPm) {
      bot.callModuleFn('pm', [text, from, replyFn, raw]);
    } else {
      bot.callModuleFn('chanmsg', [text, to, from, replyFn, raw]);
    }

    if (text.substring(0, bot.config.commandPrefix.length) === bot.config.commandPrefix) {
      const re = new RegExp(`^${reEscape(bot.config.commandPrefix)}(\\S*)\\s*(.*)$`, 'g');
      const rem = re.exec(text);
      const command = rem[1];
      const remainder = rem.length === 3 ? rem[2] : '';

      const parts = quoteSplit.parse(remainder).parts || remainder.split(' ');
      bot.callModuleFn('any_command', [remainder, parts, replyFn, command, from, to, text, raw]);
      bot.callCommandFn(command, [remainder, parts, replyFn, command, from, to, text, raw]);
    }
  });

  bot.client.on('ctcp', (from, to, text, type, raw) => {
    log.trace({
      from, to, text, type, raw, event: 'ctcp',
    });
    if (from === bot.config.owner && to === bot.client.nick && text === 'RELOAD') {
      moduleMan.reloadModules();
    } else if (from === bot.config.owner && to === bot.client.nick && text === 'LOAD') {
      moduleMan.loadModules();
    } else {
      moduleMan.callModuleFn('ctcp', [text, type, from, to, raw]);
    }
  });

  bot.client.on('action', (from, to, text, type, raw) => {
    log.trace({
      from, to, text, type, raw, event: 'action',
    });
    const isPm = (to === bot.client.nick);
    const replyTo = isPm ? from : to;
    const replyFn = bot.getReply(replyTo, isPm, from);

    moduleMan.callModuleFn('action', [text, from, to, replyFn, raw]);
    if (isPm) {
      moduleMan.callModuleFn('pmaction', [text, from, replyFn, raw]);
    } else {
      moduleMan.callModuleFn('chanaction', [text, to, from, replyFn, raw]);
    }
  });

  // This is emitted by the client right before it tries to say something.
  // Note, this will not work if we send notices or certain other events,
  // but that won't happen in practice yet
  bot.client.on('selfMessage', (to, text) => {
    log.trace({ to, text, event: 'selfMessage' });
    // Hack! This ensures that even though node-irc calls this as part of the
    // same function path, the events for pmsay/chansay happen a tick later.
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
    process.nextTick(() => {
      if (bot.isChannel(to)) {
        bot.callModuleFn('chansay', [bot.client.nick, to, text]);
      } else {
        bot.callModuleFn('pmsay', [bot.client.nick, to, text]);
      }
    });
  });

  cb();
};

bot.sayTo = function botSayTo(target, ...args) {
  // Todo, make this use stringifyArgs.
  bot.client.say(target, args.join(' '));
};
/* say("one", "two") => "one two" */
bot.say = function botSay(...args) {
  bot.client.say(bot.config.mainChannel, args.join(' '));
};

bot.joinChannels = function botJoinChans(cb) {
  let joinCb = cb;
  if (!cb) {
    joinCb = function botJoinDefaultCb(err) {
      if (err) log.error(err);
    };
  }

  const channels = Array.isArray(bot.conf.channels) ? bot.conf.channels : bot.conf.channels.split(',');
  async.map(channels, (item, joined) => {
    bot.client.join(item, () => { joined(); });
  }, joinCb);
};

bot.stringifyArgs = function botStringify(...args) {
  return args.map((el) => {
    if (typeof el === 'string') {
      return el;
    } else if (Array.isArray(el)) {
      return bot.stringifyArgs.apply(this, el);
    } else if (el === undefined || el === null) {
      return '';
    } else if (typeof el.toString === 'function') {
      return el.toString();
    }
    log.error('could not stringify', el);
    return el;
  }).join(' ');
};

bot.isChannel = function botIsChannel(name) {
  return _.some(_.map(bot.config.channelPrefixes.split(''), el => name[0] === el));
};


bot.getReply = function botGetReply(to, isPm, pmTarget) {
  const spamReply = function spamReply(...args) {
    const repStr = bot.stringifyArgs.apply(this, args);
    bot.client.say(to, repStr);
  };

  // custom reply takes options of the following:
  // {
  //   trim: true, // trim spaces, leading and trailing
  //   lines: 2, // number of lines to spam
  //   replaceNewlines: false, // whether to replace newlines with | while
  //                           // figuring out if it'll spam
  //   pmExtra: false, // whether to PM the whole message if it overflows
  // }
  const customReply = function customReply(opts, ...args) {
    // Note, this value is based on what our client does (https://github.com/martynsmith/node-irc/blob/e4000b7a8ac42d9eb16fb6c3f362e1425d664f4b/lib/irc.js#L1069), which may differ from the reality of what a given irc server enforces.
    //
    const maxLineChars = Math.min(
      bot.client.maxLineLength - to.length,
      bot.client.opt.messageSplit,
    );

    // default opts
    const replyOpts = Object.assign({
      trim: true,
      lines: 2,
      replaceNewlines: false,
      pmExtra: false,
    }, opts);

    // If it's a pm, all options get ignored
    if (isPm) {
      spamReply.apply(this, args);
      return;
    }

    // Since this is a message to a channel, we're going to now apply 'custom'
    // logic to it.
    // First, get the string representation which the module requested to send.
    let repStr = bot.stringifyArgs.apply(this, args);
    // Trim it if requested
    if (replyOpts.trim) {
      repStr = repStr.trim();
    }
    // Figure out the number of lines this would span, taking into account
    // too-long lines splitting across lines.
    const lines = repStr.split('\n');
    const numLines = lines.reduce((sum, line) => {
      // how many lines does this consume after splitting over maxLineChars?
      const linesSplitOver = Math.ceil(line.length / maxLineChars);
      // even a 0 length line gets printed and consumes space
      return sum + Math.max(1, linesSplitOver);
    }, 0);

    // If it fits in the max lines allowed, we don't have to modify anything
    if (numLines <= replyOpts.lines) {
      // Cool, we can just say it raw and be done with it.
      bot.client.say(to, repStr);
      return;
    }

    // If replaceNewlines is set, we see if ignoring '\n' and joining stuff with '|' fixes it.
    if (replyOpts.replaceNewlines) {
      const withoutNewlines = repStr.replace(/\n/g, ' | ');
      if (withoutNewlines.length <= (maxLineChars * replyOpts.lines)) {
        // Stripping was enough, we're done
        bot.client.say(to, withoutNewlines);
        return;
      }

      // This isn't fitting, say a stripped version
      bot.client.say(to, `${withoutNewlines.substring(0, maxLineChars - 4)} ...`);
      // don't return, we might have to spit out extra
    } else {
      // we know it doesn't fit like this already, let's say a trimmed down version.
      const linesToSay = [];
      const maxLength = (maxLineChars * replyOpts.lines) - 4; // -4 to leave room for '...'
      for (let i = 0; i < lines.length; i += 1) {
        if ((linesToSay.length + lines[i].length) > maxLength || i === (replyOpts.lines - 1)) {
          linesToSay.push(`${lines[i].substring(0, maxLength - linesToSay.length)} ...`);
          break;
        } else {
          linesToSay.push(lines[i]);
        }
      }
      bot.client.say(to, linesToSay.join('\n'));
    }

    if (replyOpts.pmExtra) {
      bot.client.say(pmTarget, repStr);
    }
  };

  const reply = function reply(...args) {
    if (isPm) {
      spamReply.apply(this, args);
      return;
    }
    // Default to not spam if it's not a pm
    args.unshift({
      lines: 2, replaceNewlines: false, pmExtra: false, trim: true,
    });
    customReply.apply(this, args);
  };

  // Allow callers to do things like 'reply.spam' and 'reply.custom'
  reply.spam = spamReply;
  reply.custom = customReply;

  return reply;
};

bot.createPathIfNeeded = function botCreatePathIfNeeded(fullPath, cb) {
  const dirname = path.dirname(fullPath);
  fs.mkdir(dirname, (err) => {
    if (err && err.code !== 'EEXIST') {
      // Directory doesn't already exist and couldn't be made
      cb(err);
    } else {
      // Made or already exists.
      cb(null);
    }
  });
};

bot.fsStoreData = function botFsStoreData(namespace, filePath, data, flag, cb) {
  // Flags is an optional argument
  const writeFlag = typeof flag === 'function' ? 'w' : flag;
  const writeCb = typeof flag === 'function' ? flag : cb;

  const basePath = bot.getDataFolder(namespace);
  const finalPath = path.join(basePath, filePath);

  bot.createPathIfNeeded(finalPath, (err) => {
    if (err) return writeCb(err);
    return fs.writeFile(finalPath, data, { writeFlag }, writeCb);
  });
};

bot.fsGetData = function botFsGetData(namespace, filePath, cb) {
  const basePath = bot.getDataFolder(namespace);
  const finalPath = path.join(basePath, filePath);

  fs.readFile(finalPath, cb);
};

bot.fsListData = function botFsListData(namespace, listPath, cb) {
  const basePath = bot.getDataFolder(namespace);
  const finalPath = path.join(basePath, listPath);

  fs.readdir(finalPath, cb);
};

bot.dump = function botDump() {
  if (heapdump) {
    heapdump.writeSnapshot((err, filename) => {
      log.warn('heapdump written to', filename);
    });
  } else {
    log.trace('dump called, but heapdump off');
  }
};


bot.run = function botRun() {
  async.series([
    function loadConf(cb) {
      bot.config = bot.loadConfig();
      bot.conf = bot.config;
      log.trace('loaded config');
      cb(null);
    },
    bot.initClient,
    bot.init,
    function initConnect(cb) {
      bot.client.connect(() => { cb(null); });
    },
    function initConnected(cb) {
      log.info('connected!');
      cb(null);
    },
    bot.initModuleManager,
    moduleMan.loadModules,
    bot.joinChannels,
    function unexpectedEnd(cb) {
      bot.dump();
      cb(null);
    },
  ], (err) => {
    if (err) {
      bot.dump();
      log.fatal('error in init');
      log.error(err);
    }
  });
};

module.exports = bot;
