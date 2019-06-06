const googleimages = require('google-images');
const humanize = require('humanize');
const { google } = require('googleapis');

const customsearch = google.customsearch('v1');
let customSearchOpts;

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
    if (googConf.cseID === '') {
      b.log.warn("cseID in google.josn not configured; required for google search");
      return;
    }
    if (googConf.apiKey === '') {
      b.log.warn("apiKey in google.josn not configured; required for google search");
      return;
    }
    customSearchOpts = {
      cx: googConf.cseID,
      auth: googConf.apiKey,
    };
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
  if (!customSearchOpts) return;
  customsearch.cse.list(Object.assign({}, customSearchOpts, { q: remainder }))
    .then((res) => {
      const items = res.data.items;
      if (items.length == 0) {
        reply("no results");
        return;
      }
      reply(`${items[0].link} -> ${items[0].title}`);
    }).catch((err) => {
      b.log.error(err, "google custom search error");
      reply("error performing google search");
    });
};

module.exports.run_goognum = function (r, p, reply) {
  if (!customSearchOpts) return;
  customsearch.cse.list(Object.assign({}, customSearchOpts, { q: r }))
    .then((res) => {
      reply(`${res.data.searchInformation.formattedTotalResults}`);
    }).catch((err) => {
      b.log.error(err, "google custom search error");
      reply("error performing google search");
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
