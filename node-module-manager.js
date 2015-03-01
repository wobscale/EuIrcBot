var fs = require('fs'),
		path = require('path'),
		async = require('async'),
		_ = require('underscore');

var modules = {};
var modulePaths = {};

var config;
var bot;

var me = module.exports = {};

me.init = function(botObj, cb) {
	bot = botObj;
	config = botObj.config;
	if(cb) cb(null);
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
	async.series([
			function(cb) {
				async.mapSeries(config.moduleFolders, me.loadModuleFolder, function(err, res) {
					return cb(null);
				});
			}, 
			me.initModules
	], function(err, results) {
		if(cb) cb(null);
	});
};

me.initModules = function(cb) {
	// Todo, don't ever init if they're already initted
	_.each(_.values(modules), function(mod) {
		if(typeof mod.init == 'function') {
			mod.init(me.modifyThisForModule(mod));
		}
	});
	if(cb) cb(null); //Technically they aren't initted yet if they're async. Whatev.
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
		_.extend(left.string,right.string);
		left.regex = left.regex.concat(right.regex);
		return left;
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
	var regexFns = [];
	/* exports.command = 'test'; exports.run = function(){} */
	if(typeof m.command == 'string' && m.command.length > 0 && typeof m.run == 'function') {
		commandFns[m.command] = m.run;
	}
	// exports.commands = /regex/; exports.run = function() {}
	if(m.command instanceof RegExp && typeof m.run == 'function') {
		regexFns.push([m.command, {module: m, fn: m.run}]);
	}
	// exports.commands = ['test', 'test2']; exports.run = function(){}
	// exports.commands = [/regex1/, /regex2/]; exports.run = function(){}
	if(Array.isArray(m.commands) && typeof m.run == 'function') {
		m.commands.forEach(function(c) {
			if(c instanceof RegExp) {
				regexFns.push([c, {module: m, fn: m.run}]);
			} else {
				commandFns[c] = m.run;
			}
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

	return {string: commandFnsWithModules, regex: regexFns};
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
me.traverseCommandHierarchy = function(botObj, fnObj, args) {
  var parts = args[1].slice();
  // Check above for 'parent default behavior'

	var currentDefault = null;

	while(typeof fnObj.fn === 'object') {
		if(typeof fnObj.fn._default === 'function' || fnObj.fn._default === null) {
			currentDefault = fnObj.fn._default;
		}
		fnObj.fn = fnObj.fn[parts.shift()];
	}
	args[1] = parts;

	if(typeof fnObj.fn !== 'function') {
		if(currentDefault !== null && typeof currentDefault === 'function') {
			return currentDefault.apply(me.modifyThisForModule(fnObj.module), args);
		}
		return;
	}

	return fnObj.fn.apply(me.modifyThisForModule(fnObj.module), args);
};

me.modifyThisForModule = function(module) {
	var obj = _.clone(bot);
	obj.getAllCommandFns = me.getAllCommandFns();
	obj.name = _.find(Object.keys(modules), function(mname) {
		return modules[mname] === module; 
	});

	obj.datadir = bot.getDataFolder(obj.name);

	obj.appendDataFile = function(file, data, cb) {
		if(typeof data == 'object' && !Buffer.isBuffer(data)) {
			data = JSON.stringify(data);
		}
		bot.fsStoreData(obj.name, file, data, 'a', cb);
	};
	obj.writeDataFile = function(file, data, cb) {
		bot.fsStoreData(obj.name, file, data, cb);
	};

	obj.readDataFile = function(file, cb) {
		bot.fsGetData(obj.name, file, cb);
	};

	obj.listDataFiles = function(path, cb) {
		bot.fsListData(obj.name, path, cb);
	};

	obj.modules = modules;

	obj.module = module;
	return obj;
};

me.transformModulesIntoApi = function(mods) {
	return _.map(mods, function(module, name) {
		return {
			getName: function(cb){cb(name);},
			getModule: function(cb){cb(module);},
			// Todo, add more functions here such as fsGetData stuff
		};
	});
};

me.callCommandFn = function(command, args) {
	var fns = me.getAllCommandFns();
	var call = function(ctx, args) {
		try {
			ctx.fn.apply(me.modifyThisForModule(ctx.module), args);
		} catch(ex) { console.trace("Call Command: " + command); console.log(ex); }
	};

	if(typeof fns.string[command] === 'object' && typeof fns.string[command].fn === 'function') {
		call(fns.string[command], args);
	} else {
		var matches = _.filter(fns.regex, function(regex) {
			return command.match(regex[0]);
		});

		_.each(matches, function(match) {
			call(match[1], args.concat([match[0]]));
		});
	}
};

