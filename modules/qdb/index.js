const http = require('http');

let bot;
let conf = null;

module.exports.init = function (b) {
  bot = b;
  bot.getConfig('qdb.json', (err, co) => {
    if (err) console.log('Error with QDB module, no conf');
    else conf = co;
  });
};

module.exports.commands = ['qudb', 'quodb', 'qdb'];

module.exports.post = function (data, channel, callback) {
  if (conf === null) return;
  const url = require('url').parse(conf.baseUrl);

  const req = http.request({
    hostname: url.host,
    port: url.port,
    path: '/api/quote',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  }, (res) => {
    let accum = '';
    res.on('data', (chunk) => {
      accum += chunk.toString();
    });
    res.on('end', () => {
      const id = JSON.parse(accum).id;
      callback(false, `qdb: ${conf.baseUrl}/#/quote/${id}`);
    });
  });

  req.on('error', (err) => {
    callback(`qdb: something went wrong: ${err}`);
  });

  req.write(JSON.stringify({ quote: data, source: conf.source + channel }));
  req.end();
};

const me = module.exports;

module.exports.run = function (r, parts, reply, command, from, to, text, raw) {
  if (to[0] != '#' && to[0] != '&') return; // only allow this in channels.

  const scrollbackModule = bot.modules['sirc-scrollback'];
  if (!scrollbackModule) return console.log("No scrollback, can't qdb");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) return reply(err);
    if (res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");

    me.post(res, (err, resp) => {
      if (err) reply(err);
      else reply(resp);
    });
  });
};

