var http = require('http'),
    requestify = require('requestify');

var bot;
var conf = null;

module.exports.init = function(b) {
  bot = b;
  bot.getConfig("qdb.json", function(err, co) {
    if(err) console.log("Error with QDB module, no conf");
    else conf = co;
  });
};

module.exports.commands = ['quo', 'qudb', 'quodb', 'qdb'];

module.exports.run = function(rem, parts, reply, command, from, to, text, raw) {
  if(to[0] != '#' && to[0] != '&') return; // only allow this in channels.
  if(conf === null) return;

  var scrollbackModule = bot.modules['sirc-scrollback'];
  if(!scrollbackModule) return console.log("No scrollback, can't qdb");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, parts, function(err, res) {
    if(err) return reply(err);
    if(res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");

    requestify.post(conf.baseUrl + '/api/quote', {
      quote: res,
      source: conf.source + to
    }).then(function(response) {
      var id = JSON.parse(response.body).id;
      reply(conf.baseUrl + "/#/quote/" + id);
    }).fail(function(err) {
      reply("Something went wrong: " + err);
    });
  });
};

