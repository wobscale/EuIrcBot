(function () {
'use strict';

var irc = require('irc'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async');

var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var bot = {};
var modules = {};
bot.modules = modules;
bot.modulePaths = {};

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
      if(typeof m["run" + command[0].toUpperCase + command.substring(1)] == 'function') {
        m["run" + command[0].toUpperCase + command.substring(1)].apply(bot, args);
        return;
      }
    } catch(ex) { console.log(ex); }
  });
};

bot.loadConfig = function() { //sync
  var conf;
  var default_config = {
    nick: 'suebot',
    userName: 'seubot',
    realName: 'seubot',
    server: 'irc.freenode.net',
    owner: 'ek',
    commandPrefix: '!',
    ssl: false,
    port: 6667,
    debug: false,
    mainChannel: '#seubot',
    channels: '#seubot',
    autoRejoin: true,
    showErrors: false,
    channelPrefixes: "&#",
    messageSplit: 512,
    moduleFolders: ["modules"]
  };
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

bot.client.connect(function() {
  console.log("Connected!");
  var channels = Array.isArray(bot.conf.channels) ? bot.conf.channels : bot.conf.channels.split(',');
  for(var i=0;i<channels.length;i++) bot.client.join(channels[i], console.log);
  bot.loadModules();
});

bot.getReply = function(chan) {
  return function(args) {
    var tosay = [];
    for(var i=0;i<arguments.length;i++) tosay.push(arguments[i]);
    bot.client.say(chan, tosay.join(' '));
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
    bot.callCommandFn(command, [remainder, remainder.split(/\s+/), bot.getReply(respTo), command, from, to, text, raw]);
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

}());
