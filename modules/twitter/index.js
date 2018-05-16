const Twit = require('twit');
const ent = require('ent');

let log;

let t = null;
let tConf = null;
let bot = null;

const twitRegex = /^(https?:\/\/)?(dashboard\.|www\.)?twitter\.com\/([a-zA-Z0-9_]+)(\/status(es)?\/(\d+))?/;
const nonUsers = ['search'];
module.exports.init = function (b) {
  bot = b;
  log = bot.log;
  bot.getConfig('twitter.json', (err, conf) => {
    tConf = conf;
    if (err) {
      log.error(`Unable to load twitter module: ${err}`);
      return;
    }
    try {
      t = new Twit(conf);
    } catch (ex) {
      log.error(`Error loading twitter library: ${ex}`);
    }
  });
};

module.exports.url = function (url, reply) {
  if (t === null) {
    log.error('Unable to handle twitter url; lib not loaded');
    return;
  }

  const m = twitRegex.exec(url);
  if (m) {
    if (m[3] && !m[6]) {
      if (nonUsers.indexOf(m[3]) !== -1) {
        return;
      }
      // User page
      t.get('/users/show', { screen_name: m[3] }, (err, res) => {
        if (err) reply(`Error getting user ${m[3]}`);
        else {
          reply.custom(
            { replaceNewlines: true },
            `${ent.decode(res.name)} (@${ent.decode(res.screen_name)}): ${ent.decode(res.description)}`,
          );
        }
      });
    } else {
      const id = m[6];
      t.get('/statuses/show/:id', { id, tweet_mode: 'extended' }, (err, res) => {
        if (err) reply('Error getting tweet');
        else {
          reply.custom(
            { replaceNewlines: true },
            `${ent.decode(res.user.name)} (@${ent.decode(res.user.screen_name)}): ${ent.decode(res.full_text)}`,
          );
        }
      });
    }
  }
};


module.exports.commands = ['quoth'];

module.exports.post = function (data, channel, callback) {
  t.post('statuses/update', { status: data }, (err, res) => {
    if (err) {
      callback(err);
      return;
    }
    callback(false, `${tConf.baseUrl}status/${res.id_str}`);
  });
};

const me = module.exports;


module.exports.run = function (r, parts, reply, command, from, to) {
  if (to[0] !== '#' && to[0] !== '&') return;

  const scrollbackModule = bot.modules['sirc-scrollback'];

  if (!scrollbackModule) {
    this.log.warning("No scrollback, can't tweet");
    return;
  }

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) {
      reply(err);
      return;
    }
    if (res.match(/(pls|#)noquo/)) {
      reply("don't be a deck, betch");
      return;
    }

    me.post(res, (postErr, resp) => {
      if (postErr) reply(postErr);
      else reply(resp);
    });
  });
};
