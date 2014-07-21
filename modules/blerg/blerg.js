var config;
var bot;

var blerg = require('blerg');

module.exports.init = function(b) {
  bot = b;
  bot.getConfig("blerg.json", function(err, conf) {
    if(err) return console.log(err);
    config = conf;

    blerg.login(config.username, config.password, function(err) {
        if(err) return console.log("Trouble logging into blerg account: " + err);
    });
  });
};

module.exports.commands = ['quob', 'qub', 'blergit'];

module.exports.run = function(rem, parts, reply, command, from, to, text, raw) {
  if(to[0] != '#') return; // Channels can start with & too? Really? Wow, good thing noone does that


  var scrollbackModule = bot.modules['sirc-scrollback'];

  if(!scrollbackModule) return console.log("No scrollback, can't blerg");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, parts, function(err, res) {
    if(err) return reply(err);

    var indented = res.split("\n").map(function(l) {
      return "    " + l; // 4 spaces, pre sorta thing
    }).join("\n");

    blerg.put(indented, function(err) {
      if(err) return reply(err);
      bot.sayTo(from, "Blerged it!");
    });
  });
};

