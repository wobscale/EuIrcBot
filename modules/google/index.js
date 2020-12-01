const googleimages = require('google-images');
const humanize = require('humanize');
const google = require('google-it');

let b;

let googleimgs;

module.exports.init = function (bot) {
  // See instructions at https://github.com/vdemedes/google-images#google-images for how to set this mess up
  b = bot;
  b.getConfig('google.json', (err, googConf) => {
    if (err) {
      b.log.warn(err, 'unable to load google.json config; google searches will not work');
      return;
    }
    if (googConf.apiKey === '') {
      b.log.warn('apiKey in google.josn not configured; required for google search');
      return;
    }
    b.getConfig('googleimgs.json', (err, imgsConf) => {
      if (err) {
        b.log.log(err, 'error loading googleimgs.json');
        return;
      }
      let cseID = imgsConf.cseID || googConf.cseID;
      if (imgsConf.cseID === '') {
        b.log.log('cseID (googleimgs.json) not configured, required for google image search');
        return;
      }
      googleimgs = googleimages(imgsConf.cseID, googConf.apiKey);
    });
  });
};

module.exports.commands = ['g', 'google'];

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  google({
    query: remainder,
    noDisplay: true,
    disableConsole: true,
  })
    .then((res) => {
      if (res.length === 0) {
        reply('no results');
        return;
      }
      reply(`${res[0].link} -> ${res[0].title}`);
    }).catch((err) => {
      b.log.error(err, 'google search error');
      reply('error performing google search');
    });
};

const firstimg = function (r, p, reply) {
  if (!googleimgs) {
    b.log.error('Google images not configured correctly on this bot');
    return;
  }
  googleimgs.search(r)
    .then((imgs) => {
      if (imgs.length === 0) return reply("Couldn't find zip, nadda, nothin'");

      return reply(imgs[0].url);
    });
};

module.exports.run_gi = firstimg;
module.exports.run_gimg = firstimg;
module.exports.run_gimgs = firstimg;
