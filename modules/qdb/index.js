var http = require('http');

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
  var url = require('url').parse(conf.baseUrl);

  var scrollbackModule = bot.modules['sirc-scrollback'];
  if(!scrollbackModule) return console.log("No scrollback, can't qdb");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, function(err, res) {
    if(err) return reply(err);
    if(res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");

    var req = http.request({
      hostname: url.host,
      port: url.port,
      path: '/api/quote',
      method: 'POST',
      headers: {"Content-Type": "application/json; charset=utf-8"},
    }, function(res) {
      var accum = '';
      res.on('data', function(chunk) {
        accum += chunk.toString();
      });
      res.on('end', function() {
        var id = JSON.parse(accum).id;
        reply(conf.baseUrl + "/#/quote/" + id);
      });
    });

    req.on('error', function(err) {
      reply("Something went wrong: " + err);
    });

    req.write(JSON.stringify({quote: res, source: conf.source + to}));
    req.end();
  });
};

