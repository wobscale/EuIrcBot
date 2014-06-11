var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore');

var modules = {};
var modulePaths = {};

var config;
var bot;

var me = module.exports = {};

me.init = function(botObj) {
  bot = botObj;
  config = botObj.config;
};

me.getModuleName = function(mpath) {
  var m;
  var stats = fs.statSync(mpath);
  if(stats.isFile()) {
    try {
      m = require(mpath).name;
      if(m) return m;
    } catch(ex) {
      /* not a warning yet. Eventually maybe */
    }
  } else if(stats.isDirectory()) {
    try {
      m = JSON.parse(fs.readFileSync(path.join(mpath, 'package.json'))).name;
      if(m) return m;
    } catch(ex) {
      console.log("Invalid package.json for " + mpath);
      console.log(ex);
    }
  }
  return mpath;
};

me.loadModuleFolder = function(folder, cb) {
  fs.readdir(path.join('.',folder), function(err, mPaths) {
    if(err) {
      console.log(err);
      // Don't err; it'll stop async from hitting up other module folders
      return cb(null, {modules: {}, modulePaths: {}});
    }
    //Exclude hidden files and folders
    mPaths = mPaths.filter(function(i){return i[0] !== '.';});
    for(var i=0;i<mPaths.length;i++) {
      /* ./ required because of how require works. go figure. */
      var fullPath = './' + path.join('.', folder, mPaths[i]);
      var moduleName = me.getModuleName(fullPath);
      if(modules[moduleName]) continue;
      try {
        var mod = require(fullPath);
        if(mod.disabled) continue;
        modules[moduleName] = mod;
        modulePaths[moduleName] = fullPath;
      } catch(ex) {
        console.error(ex.stack);
        console.error(ex);
      }
    }
    cb(false, {modules: modules, modulePaths: modulePaths});
  });
};

me.loadModules = function(cb) {
  async.mapSeries(config.moduleFolders, me.loadModuleFolder, function(err, results) {
    if(cb) cb(null);
  });
};

me.initModules = function(cb) {
  _.each(_.values(modules), function(mod) {
    if(typeof mod.init == 'function') {
      mod.init(bot);
    }
  });
  cb(null); //Technically they aren't initted yet if they're async. Whatev.
};

me.reloadModules = function() {
  var numToUnload = _.keys(modules).length;
  _.keys(modules).forEach(function(name) {
    if(typeof modules[name].unload == "function") {
      modules[name].unload(function() {
        var nam = require.resolve(modulePaths[name]);
        delete require.cache[nam];
        numToUnload--;
        if(numToUnload === 0) return me.loadModules();
      });
    } else {
      var nam = require.resolve(modulePaths[name]);
      delete require.cache[nam];
      numToUnload--;
      if(numToUnload === 0) return me.loadModules();
    }
  });
};

me.callModuleFn = function(fname, args) {
  _.values(modules).forEach(function(m) {
    if(typeof m[fname] == 'function') {
      try {
        m[fname].apply(bot, args);
      } catch(ex) {
        console.log(ex.stack);
        console.log(ex);
      }
    }
  });
};
me.getAllCommandFns = function() {
  return _.reduce(_.values(modules).map(function(m) {
    return me.getModuleCommandFns(m);
  }), function(left, right) {
    return _.extend(left,right);
  });
};

/* Returns a key/value map of commands:
 * {
 *   command: {
 *     module: m,
 *     fn: f
 *   }
 * }
 */
me.getModuleCommandFns = function(m) {
  var commandFns = {};
  /* exports.command = 'test'; exports.run = function(){} */
  if(typeof m.command == 'string' && m.command.length > 0 && typeof m.run == 'function') {
    commandFns[m.command] = m.run;
  }
  // exports.commands = ['test', 'test2']; exports.run = function(){}
  if(Array.isArray(m.commands) && typeof m.run == 'function') {
    m.commands.forEach(function(c) {
      commandFns[c] = m.run;
    });
  }
  // export.commands = { test: function() {} }
  if(!Array.isArray(m.commands) && typeof m.commands == 'object') {
    Object.keys(m.commands).forEach(function(command) {
      if(typeof m.commands[command] == 'function') {
        commandFns[command] = m.commands[command];
      } else if(typeof m.commands[command] == 'object') {
        // exports.commands = {test: {hirarchy: function(){}}}
        // This one's kinda icky. We're just going to assume only
        // the top level ones matter; the specific help of the command
        // can mention other ones.
        commandFns[command] = function(args) {
          me.traverseCommandHirarchy(bot, {fn: m.commands[command], module: m}, Array.prototype.slice.apply(arguments));
        };
      }
    });
  }
  // exports.run_test; exports.runTest
  Object.keys(m).forEach(function(key) {
    if(typeof m[key] != 'function') return; //continue

    if(key.indexOf('run') === 0 && key.length > 3) {
      if(key[3] == '_' && key.length > 4) {
        commandFns[key.substr(4)] = m[key];
      } else {
        var c = key.substr(3);
        c = c[0].toLowerCase() + c.substr(1);
        commandFns[c] = m[key];
      }
    }
  });
  var commandFnsWithModules = _.object(_.map(commandFns, function(fn, command) {
    return [command, {module: m, fn: fn}];
  }));

  return commandFnsWithModules;
};


me.traverseCommandHirarchy = function(botObj, fnObj, args) {
  var parts = args[1].slice();
  while(typeof fnObj.fn == 'object') {
    fnObj.fn = fnObj.fn[parts.shift()];
  }
  args[1] = parts;

  if(typeof fnObj.fn !== 'function') return;

  return fnObj.fn.apply(me.modifyThisForModule(botObj, fnObj.module), args);
};

me.modifyThisForModule = function(module) {
  var obj = _.clone(bot);
  obj.getAllCommandFns = me.getAllCommandFns;
  obj.name = _.find(Object.keys(modules), function(mname) { return modules[mname] === module; });
  obj.datadir = bot.getDataFolder(obj.name);
  obj.module = module;
  return obj;
};

me.callCommandFn = function(command, args) {
  var fns = me.getAllCommandFns();
  if(typeof fns[command] === 'object' && typeof fns[command].fn === 'function') {
    try {
      fns[command].fn.apply(me.modifyThisForModule(bot, fns[command].module), args);
    } catch(ex) { console.trace("Call Command: " + command); console.log(ex); }
  }
};
