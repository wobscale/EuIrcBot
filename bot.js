(function () {
'use strict';

var irc = require('irc'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    path = require('path');

var default_config = fs.readFileSync("./config.example.json");

var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var bot = {};
var modules = {};
bot.modules = modules;
bot.modulePaths = {};

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

bot.getConfig = function(name, cb) {
  fs.readFile(path.join(bot.configfolder, name),{encoding: 'utf8'}, function(err, res) {
    if(err) cb(err);
    try {
      cb(null, JSON.parse(res));
    } catch(ex) {
      cb(null, res);
    }
  });
};

bot.loadModuleFolder = function(folder, cb) {
  fs.readdir('./'+folder, function(err, moduleNames) {
    if(err) {
      console.log(err);
      return cb(err);
    }
    //Exclude hidden files and folders
    moduleNames = moduleNames.filter(function(i){return i[0] !== '.';});
    for(var i=0;i<moduleNames.length;i++) {
      if(modules[moduleNames[i]]) continue;
      try {
        var mod = require("./"+folder+"/"+moduleNames[i]);
        if(mod.disabled) continue;
        modules[moduleNames[i]] = mod;
        bot.modulePaths[moduleNames[i]] = "./"+folder+"/"+moduleNames[i];
        if(typeof mod.init == "function") mod.init(bot);
      } catch(ex) {
        console.error(ex.stack);
        console.error(ex);
      }
    }
    cb(false, modules);
  });
};

bot.loadModules = function() {
  modules = {};
  bot.modules = modules;
  async.mapSeries(bot.config.moduleFolders, bot.loadModuleFolder, function(err, results) {
    if(err) console.log(err);
  });
};

bot.reloadModules = function() {
  var numToUnload = _.keys(modules).length;
  _.keys(modules).forEach(function(name) {
    if(typeof modules[name].unload == "function") {
      modules[name].unload(function() {
        var nam = require.resolve(bot.modulePaths[name]);
        delete require.cache[nam];
        numToUnload--;
        if(numToUnload === 0) return bot.loadModules();
      });
    } else {
      var nam = require.resolve(bot.modulePaths[name]);
      delete require.cache[nam];
      numToUnload--;
      if(numToUnload === 0) return bot.loadModules();
    }
  });
};

bot.callModuleFn = function(fname, args) {
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

bot.callCommandFn = function(command, args) {
  _.values(modules).forEach(function(m) {
    try {
      if(typeof m.command == 'string' && m.command == command && typeof m.run == 'function') {
        m.run.apply(bot, args);
        return;
      }
      if(Array.isArray(m.commands) && m.commands.indexOf(command) !== -1 && typeof m.run == 'function') {
        m.run.apply(bot, args);
        return;
      }
      if(!Array.isArray(m.commands) && typeof m.commands == 'object' && typeof m.commands[command] == 'function') {
        m.commands[command].apply(bot, args);
        return;
      }
      if(typeof m["run_"+command] == 'function') {
        m["run_"+command].apply(bot, args);
        return;
      }
      if(typeof (m["run" + command[0].toUpperCase() + command.substring(1)]) === 'function') {
        m["run" + command[0].toUpperCase() + command.substring(1)].apply(bot, args);
        return;
      }
      if(typeof m.commands === 'object' && typeof m.commands[command] === 'object') {
        var parts = args[1].slice();
        var fnObj = m.commands[command];
        while(typeof fnObj === 'object') {
          fnObj = fnObj[parts.shift()];
        }
        args[1] = parts;
        if(typeof(fnObj) === 'function') {
          fnObj.apply(bot, args);
          return;
        }
      }
    } catch(ex) { console.log(ex); }
  });
};

bot.loadConfig = function() { //sync
  var conf;
  try {
    conf = JSON.parse(fs.readFileSync('./config.json'));
    var def_keys = Object.keys(default_config);
    for(var i=0;i<def_keys;i++) {
      if(typeof conf[def_keys[i]] === 'undefined')  {
        console.log("Setting: ", def_keys[i], " to ", default_config[def_keys[i]]);
        conf[def_keys[i]] = default_config[def_keys[i]];
      }
    }
  } catch(e) {
    console.log("Error reading config:", e);
    conf = default_config;
  }
  return conf;
};

var conf = bot.loadConfig();
bot.config = conf;



bot.client = new irc.Client(conf.server, conf.nick, {
  userName: conf.userName,
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
bot.conf = conf;

/* say("one", "two") => "one two" */
bot.say = function(args) {
  var tosay = [];
  for(var i=0;i<arguments.length;i++) {
    tosay.push(arguments[i]);
  }
  bot.client.say(bot.config.mainChannel, tosay.join(' '));
};

bot.joinChannels = function() {
  var channels = Array.isArray(bot.conf.channels) ? bot.conf.channels : bot.conf.channels.split(',');
  for(var i=0;i<channels.length;i++) bot.client.join(channels[i], console.log);
};


bot.getReply = function(chan) {
  var stringifyArgs = function(args) {
    var strParts = [];
    for(var i=0;i<arguments.length;i++) {
      if(typeof arguments[i] === 'string') {
        strParts.push(arguments[i]);
      } else if(Array.isArray(arguments[i])) {
        strParts.push(stringifyArgs.apply(this, arguments[i]));
      } else if(arguments[i] === undefined || arguments[i] === null) {
        strParts.push('');
      } else{
        strParts.push(arguments[i].toString());
      }
    }
    return strParts.join(' ');
  };

  return function(args) {
    bot.client.say(chan, stringifyArgs.apply(this, arguments));
  };
};

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
    bot.callCommandFn(command, [remainder, bot.util.quotedSplit(remainder), bot.getReply(respTo), command, from, to, text, raw]);
  }
});

bot.client.on('ctcp', function(from, to, text, type, raw) {
  if(from == bot.config.owner && to == bot.client.nick && text == "RELOAD") {
    bot.reloadModules();
  } else if(from == bot.config.owner && to == bot.client.nick && text == "LOAD") {
    bot.loadModules();
  } else {
    bot.callModuleFn('ctcp', [text, type, from, to, raw]);
  }
});


bot.init(function(err) {
  if(err) return console.log(err);
  bot.client.connect(function() {
    console.log("Connected!");
    bot.joinChannels();
    bot.loadModules();
  });
});

}());
