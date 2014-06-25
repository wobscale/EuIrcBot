var http = require('http');
module.exports.commands = ['quo', 'qudb', 'quodb', 'qdb'];

var bot;

module.exports.init = function(b) {
  bot = b;
};

module.exports.run = function(rem, parts, reply, command, from, to, text, raw) {
  if(to[0] != '#' && to[0] != '&') return;

  var scrollbackModule = bot.modules['sirc-scrollback'];

  if(!scrollbackModule) return console.log("No scrollback, can't qdb");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, parts, function(err, res) {
    if(err) return reply(err);

    http.get('http://qdb.amazdong.com/new?text=' + encodeURIComponent(res), function(res) {
      // All good
    }).on('error', function(e) {
      reply("Error qdbing - " + e);
    });
  });
};

