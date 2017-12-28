const request = require('request');
const { URL } = require('url');

let bot;
let conf = null;

module.exports.init = function init(b) {
  bot = b;
  bot.getConfig('qdb.json', (err, co) => {
    if (err) this.error('qdb.json missing');
    else conf = co;
  });
};

module.exports.commands = ['qudb', 'quodb', 'qdb'];

module.exports.post = function postQuote(data, channel, callback) {
  if (conf === null) return;
  const url = new URL('/api/quote', conf.baseUrl);

  request.post(url.toString(), {
    json: true,
    body: { quote: data, source: conf.source + channel },
  }, (e, _, resp) => {
    if (e) {
      callback(e);
    } else {
      callback(false, `qdb: ${conf.baseUrl}/#/quote/${resp.id}`);
    }
  });
};

const me = module.exports;

module.exports.run = function run(r, parts, reply, command, from, to) {
  if (to[0] !== '#' && to[0] !== '&') return; // only allow this in channels.

  const scrollbackModule = bot.modules['sirc-scrollback'];
  if (!scrollbackModule) {
    this.log.warn("No scrollback, can't qdb");
    return;
  }

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, scrollbackLines) => {
    if (err) {
      reply(err);
      return;
    }
    if (scrollbackLines.match(/(pls|#)noquo/)) {
      reply("don't be a deck, betch");
      return;
    }

    me.post(scrollbackLines, (err2, quoUrl) => {
      if (err) reply(err2);
      else reply(quoUrl);
    });
  });
};

