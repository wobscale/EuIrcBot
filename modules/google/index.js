let google = require('google'),
  googleimages = require('google-images'),
  humanize = require('humanize');

let b;
let config;

let googleimgs;

module.exports.init = function (bot) {
  // See instructions at https://github.com/vdemedes/google-images#google-images for how to set this mess up
  b = bot;
  b.getConfig('google.json', (err, googConf) => {
    if (err) {
      console.log(err);
      return;
    }
    b.getConfig('googleimgs.json', (err, imgsConf) => {
      if (err) {
        console.log(err);
        return;
      }
      if (imgsConf.cseID === '') {
        console.log('cseID (googleimgs.json) not configured, required for google image search');
        return;
      }
      googleimgs = googleimages(imgsConf.cseID, googConf.apiKey);
    });
  });
};

module.exports.commands = ['g', 'google'];

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  google(remainder, (err, next, links) => {
    if (err || links.length === 0) { return reply('No results'); }
    for (let i = 0; i < links.length; i++) {
      if (links[i].link === null) continue;
      else {
        return reply(`${links[i].link.replace('(', '%28').replace(')', '%29')} -> ${links[i].title}`);
      }
    }
  });
};

module.exports.run_goognum = function (r, p, reply) {
  google(r, (err, next, links, num) => {
    if (err || links.length === 0) return reply('0 results');

    return reply(`${humanize.numberFormat(num, 0)} results`);
  });
};

const firstimg = function (r, p, reply) {
  if (!googleimgs) {
    console.error('Google images not configured correctly on this bot');
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
