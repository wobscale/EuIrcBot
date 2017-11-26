const Twit = require('twit');
const ent = require('ent');

let log;

let t = null;
let tConf = null;
let bot = null;

const twitRegex = /^(https?\:\/\/)?(dashboard\.|www\.)?twitter\.com\/([a-zA-Z0-9_]+)(\/status(es)?\/(\d+))?/;
const nonUsers = ['search'];
module.exports.init = function (b) {
  bot = b;
  log = bot.log;
  bot.getConfig('twitter.json', (err, conf) => {
    tConf = conf;
    if (err) return log.error(`Unable to load twitter module: ${err}`);
    try {
      t = new Twit(conf);
    } catch (ex) {
      log.error(`Error loading twitter library: ${ex}`);
    }
  });
};

module.exports.url = function (url, reply) {
  if (t === null) return log.error('Unable to handle twitter url; lib not loaded');

  let m;
  if ((m = twitRegex.exec(url))) {
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
      const uname = m[3];
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
    if (err) return callback(err);
    callback(false, `${tConf.baseUrl}status/${res.id_str}`);
  });
};

const me = module.exports;


module.exports.run = function (r, parts, reply, command, from, to) {
  if (to[0] != '#' && to[0] != '&') return;

  const scrollbackModule = bot.modules['sirc-scrollback'];

  if (!scrollbackModule) return console.log("No scrollback, can't tweet");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) return reply(err);
    if (res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");

    me.post(res, (err, resp) => {
      if (err) reply(err);
      else reply(resp);
    });
  });
};
