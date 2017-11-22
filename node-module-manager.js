let fs = require('fs'),
  path = require('path'),
  async = require('async'),
  _ = require('lodash'),
  bunyan = require('bunyan');

const modules = {};
const modulePaths = {};

let config;
let bot;
let log;

const me = module.exports = {};

me.init = function (botObj, logObj, cb) {
  bot = botObj;
  log = logObj;
  config = botObj.config;
  if (cb) cb(null);
};

me.getModuleName = function (mpath) {
  let m;
  const stats = fs.statSync(mpath);
  try {
    m = require(mpath).name;
    if (m) return m;
  } catch (ex) {
    /* not a warning yet. Eventually maybe */
  }
  if (stats.isDirectory()) {
    try {
      m = JSON.parse(fs.readFileSync(path.join(mpath, 'package.json'))).name;
      if (m) return m;
    } catch (ex) {
      log.warn(ex, 'invalid package.json for %s', mpath);
    }
  }
  return mpath;
};

me.loadModuleFolder = function (folder, cb) {
  fs.readdir(path.join('.', folder), (err, mPaths) => {
    if (err) {
      log.warn(err, 'error reading module folder: %s', folder);
      // Don't err; it'll stop async from hitting up other module folders
      return cb(null, { modules: {}, modulePaths: {} });
    }
    // Exclude hidden files and folders
    mPaths = mPaths.filter(i => i[0] !== '.');
    for (let i = 0; i < mPaths.length; i++) {
      /* ./ required because of how require works. go figure. */
      const fullPath = `./${path.join('.', folder, mPaths[i])}`;
      const moduleName = me.getModuleName(fullPath);
      if (_.includes(config.disabledModules, moduleName)) {
        continue;
      }
      if (modules[moduleName]) continue;
      try {
        const mod = require(fullPath);
        if (mod.disabled) continue;
        modules[moduleName] = mod;
        modulePaths[moduleName] = fullPath;
      } catch (ex) {
        log.error(ex, 'error loading %s', folder);
      }
    }
    cb(false, { modules, modulePaths });
  });
};

me.loadModules = function (cb) {
  async.series([
    function (cb) {
      async.mapSeries(config.moduleFolders, me.loadModuleFolder, (err, res) => cb(null));
    },
    me.initModules,
  ], (err, results) => {
    if (cb) cb(null);
  });
};

me.initModules = function (cb) {
  // Todo, don't ever init if they're already initted
  _.forEach(modules, (mod, name) => {
    mod.log = bunyan.createLogger({
      name: `euircbot/${name}`,
      serializers: { err: bunyan.stdSerializers.err },
    });
    mod._name = name;
    if (typeof mod.init === 'function') {
      mod.init(me.modifyThisForModule(mod));
    }
  });
  if (cb) cb(null); // Technically they aren't initted yet if they're async. Whatev.
};

me.reloadModules = function () {
  let numToUnload = _.keys(modules).length;
  _.keys(modules).forEach((name) => {
    if (typeof modules[name].unload === 'function') {
      modules[name].unload(() => {
        const nam = require.resolve(modulePaths[name]);
        delete require.cache[nam];
        numToUnload--;
        if (numToUnload === 0) return me.loadModules();
      });
    } else {
      const nam = require.resolve(modulePaths[name]);
      delete require.cache[nam];
      numToUnload--;
      if (numToUnload === 0) return me.loadModules();
    }
  });
};

me.callModuleFn = function (fname, args) {
  _.values(modules).forEach((m) => {
    if (typeof m[fname] === 'function') {
      try {
        m[fname].apply(bot, args);
      } catch (ex) {
        log.warn({ err: ex, func: fname, args }, 'exception calling module function');
      }
    }
  });
};
me.getAllCommandFns = function () {
  return _.reduce(_.values(modules).map(m => me.getModuleCommandFns(m)), (left, right) => {
    left.string = left.string.concat(right.string);
    left.regex = left.regex.concat(right.regex);
    return left;
  });
};

/* Returns an object with two types of command functions; string type and regex
 * type.  The 'string' key contains an array of the command string along with an object
 * containing its module reference and a function reference.  The regex type is
 * an array of the same form, except it's first element is a regex, not a string,
 * Example input/output pair:
 *
 * Input:
 * Module of: {
 *   commands: ['test1', 'test2', /^asdf$/]
 *   run:  someFunction,
 *   run_xyz: someFunction2
 * }
 *
 * Output:
 * {
 *   string: [
 *     ["test1", {
 *        module: m,
 *        fn: someFunction
 *     }],
 *     ["test2", {
 *        module: m,
 *        fn: someFunction
 *     }],
 *     ["xyz", {
 *        module: m,
 *        fn: someFunction2
 *     }]
 *   },
 *   regex: [[/^asdf$/, {module: m, fn: someFunction}]]
 * }
 */
me.getModuleCommandFns = function (m) {
  const commandFns = {};
  const regexFns = [];
  /* exports.command = 'test'; exports.run = function(){} */
  if (typeof m.command === 'string' && m.command.length > 0 && typeof m.run === 'function') {
    commandFns[m.command] = m.run;
  }
  // exports.commands = /regex/; exports.run = function() {}
  if (m.command instanceof RegExp && typeof m.run === 'function') {
    regexFns.push([m.command, { module: m, fn: m.run }]);
  }
  // exports.commands = ['test', 'test2']; exports.run = function(){}
  // exports.commands = [/regex1/, /regex2/]; exports.run = function(){}
  if (Array.isArray(m.commands) && typeof m.run === 'function') {
    m.commands.forEach((c) => {
      if (c instanceof RegExp) {
        regexFns.push([c, { module: m, fn: m.run }]);
      } else {
        commandFns[c] = m.run;
      }
    });
  }
  // export.commands = { test: function() {} }
  if (!Array.isArray(m.commands) && typeof m.commands === 'object') {
    Object.keys(m.commands).forEach((command) => {
      if (typeof m.commands[command] === 'function') {
        commandFns[command] = m.commands[command];
      } else if (typeof m.commands[command] === 'object') {
        // exports.commands = {test: {hierarchy: function(){}}}
        // This one's kinda icky. We're just going to assume only
        // the top level ones matter; the specific help of the command
        // can mention other ones.
        commandFns[command] = function (args) {
          me.traverseCommandHierarchy(bot, { fn: m.commands[command], module: m }, Array.prototype.slice.apply(arguments));
        };
      }
    });
  }
  // exports.run_test; exports.runTest
  Object.keys(m).forEach((key) => {
    if (typeof m[key] !== 'function') return; // continue

    if (key.indexOf('run') === 0 && key.length > 3) {
      if (key[3] == '_' && key.length > 4) {
        commandFns[key.substr(4)] = m[key];
      } else {
        let c = key.substr(3);
        c = c[0].toLowerCase() + c.substr(1);
        commandFns[c] = m[key];
      }
    }
  });
  const commandFnsWithModules = _.map(commandFns, (fn, command) => [command, { module: m, fn }]);

  return { string: commandFnsWithModules, regex: regexFns };
};


/*
 * exports = {
 *   x: {
 *     y: {
 *       z: function(){
 *         console.log("You ran !x y z");
 *       },
 *       _default: function() {
 *         console.log("You ran !x y, not !x y z");
 *       }
 *     }
 *   }
 * }
 *
 * //parent default behavior demo
 * exports = {
 *   x: {
 *     _default: function() {
 *       console.log("You called `!x` or `!x y`, but not `!x y z`");
 *     },
 *     y: {
 *       z: function(){}
 *     }
 *   }
 * }
 *
 * // Parent default overriding
 * exports = {
 *   x: {
 *     _default: function(){
 *       console.log("I only get called for `!x [<unknown>]`, not `!x y` as happens above");
 *     },
 *     y: {
 *       _default: null,
 *       z: function(){}
 *     }
 *   }
 * }
 */
me.traverseCommandHierarchy = function (botObj, fnObj, args) {
  const parts = args[1].slice();
  // Check above for 'parent default behavior'

  let currentDefault = null;

  while (typeof fnObj.fn === 'object') {
    if (typeof fnObj.fn._default === 'function' || fnObj.fn._default === null) {
      currentDefault = fnObj.fn._default;
    }
    fnObj.fn = fnObj.fn[parts.shift()];
  }
  args[1] = parts;

  if (typeof fnObj.fn !== 'function') {
    if (currentDefault !== null && typeof currentDefault === 'function') {
      return currentDefault.apply(me.modifyThisForModule(fnObj.module), args);
    }
    return;
  }

  return fnObj.fn.apply(me.modifyThisForModule(fnObj.module), args);
};

me.modifyThisForModule = function (module) {
  const obj = _.clone(bot);
  obj.getAllCommandFns = me.getAllCommandFns();

  obj.name = module._name;
  obj.datadir = bot.getDataFolder(obj.name);

  obj.appendDataFile = function (file, data, cb) {
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      data = JSON.stringify(data);
    }
    bot.fsStoreData(obj.name, file, data, 'a', cb);
  };
  obj.writeDataFile = function (file, data, cb) {
    bot.fsStoreData(obj.name, file, data, cb);
  };

  obj.readDataFile = function (file, cb) {
    bot.fsGetData(obj.name, file, cb);
  };

  obj.listDataFiles = function (path, cb) {
    bot.fsListData(obj.name, path, cb);
  };

  obj.modules = modules;

  obj.module = module;
  obj.log = module.log;
  return obj;
};

me.transformModulesIntoApi = function (mods) {
  return _.map(mods, (module, name) => ({
    getName(cb) { cb(name); },
    getModule(cb) { cb(module); },
    // Todo, add more functions here such as fsGetData stuff
  }));
};

me.callCommandFn = function (command, args) {
  const fns = me.getAllCommandFns();
  const call = function (ctx, args) {
    try {
      ctx.fn.apply(me.modifyThisForModule(ctx.module), args);
    } catch (ex) { log.warn({ err: ex, command, args }); }
  };

  // String functions
  _.each(fns.string, (fn) => {
    if (fn.length === 2 && fn[0] === command && typeof fn[1] === 'object' && typeof fn[1].fn === 'function') {
      call(fn[1], args);
    }
  });

  // Regex functions
  const matches = _.filter(fns.regex, regex => command.match(regex[0]));

  _.each(matches, (match) => {
    call(match[1], args.concat([match[0]]));
  });
};

