const fs = require('fs');
const _ = require('underscore');
const async = require('async');
const path = require('path');
const moduleMan = require('./node-module-manager');
const changeCase = require('change-case');
const bunyan = require('bunyan');
const express = require('express');
const bodyParser = require('body-parser');

let heapdump = null;

const log = bunyan.createLogger({
  name: 'euircbot',
  serializers: { err: bunyan.stdSerializers.err },
});

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


bot.serveWebhook = function botServeWebhook(cb) {
  const app = express().use(bodyParser.json());
  app.post('/', (req, res) => {
    let replied = false;
    const replyFn = bot.getReply((resp) => {
      replied = true;
      res.json({
        speech: resp,
        displayText: resp,
        data: {},
        contextOut: [],
        source: '^',
      });
    });
    const command = req.body.result.parameters.command;
    const args = req.body.result.parameters.args || [];
    bot.callCommandFn(command, [args.join(' '), args, replyFn, command, 'caller', 'webhook', '', req.body]);

    setTimeout(() => {
      if (!replied) {
        res.status(404).send("No command replied in 3s");
      }
    }, 3000);
  });

  app.listen('3000');
  cb();
};

bot.sayTo = function botSayTo() {
  throw new Error('unimplemented for this one');
};
bot.say = function botSay() {
  throw new Error('unimplemented for this one');
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


bot.getReply = function botGetReply(cb) {
  const spamReply = function spamReply(...args) {
    const repStr = bot.stringifyArgs.apply(this, args);
    cb(repStr);
  };

  const customReply = function customReply(opts, ...args) {
    spamReply.apply(this, args);
  };

  const reply = function reply(...args) {
    spamReply.apply(this, args);
  };

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
    bot.serveWebhook,
    bot.init,
    function initConnected(cb) {
      log.info('connected!');
      cb(null);
    },
    bot.initModuleManager,
    moduleMan.loadModules,
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
