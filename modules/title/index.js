var cheerio = require('cheerio'),
    request = require('request');

module.exports.command = 'title';

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var url = remainder.trim();
  if(!/^https?:\/\//.test(url)) {
    url = "http://" + remainder;
  }

  request(url, function(err, resp, html) {
    if(err) return reply(err);

    reply(cheerio('title', html).text());
  });
};
