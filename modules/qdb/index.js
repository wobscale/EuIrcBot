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

module.exports.commands = ['qudb', 'quodb', 'qdb'];

module.exports.post = function(data, channel, callback) {
  if(conf === null) return;
  var url = require('url').parse(conf.baseUrl);

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
      callback(false, "qdb: " + conf.baseUrl + "/#/quote/" + id);
    });
  });

  req.on('error', function(err) {
    callback("qdb: something went wrong: " + err);
  });

  req.write(JSON.stringify({quote: data, source: conf.source + channel}));
  req.end();
};

var me = module.exports;

module.exports.run = function(r, parts, reply, command, from, to, text, raw) {
  if(to[0] != '#' && to[0] != '&') return; // only allow this in channels.

  var scrollbackModule = bot.modules['sirc-scrollback'];
  if(!scrollbackModule) return console.log("No scrollback, can't qdb");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, function(err, res) {
    if(err) return reply(err);
    if(res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");

    me.post(res, function(err, resp) {
      if(err) reply(err);
      else reply(resp);
    });
  });
};

