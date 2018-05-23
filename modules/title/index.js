const cheerio = require('cheerio');
const request = require('request');

module.exports.command = 'title';

function getSelector(url, selector, reply) {
  let cleanedUrl = url.trim();
  if (!/^https?:\/\//.test(cleanedUrl)) {
    cleanedUrl = `http://${cleanedUrl}`;
  }

  const options = {
    url,
    jar: true,
  };

  request(options, (err, resp, html) => {
    if (err) {
      reply(err);
      return;
    }

    const res = cheerio(selector, html);
    reply(res.first().text().trim());
  });
}

module.exports.run_title = function (remainder, p, reply) {
  getSelector(remainder, 'title', reply);
};
module.exports.run_websel = function (r, p, reply) {
  getSelector(p[1], p[0], reply);
};
