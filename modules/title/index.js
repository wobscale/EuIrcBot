var cheerio = require('cheerio'),
    request = require('request');

module.exports.command = 'title';

function getSelector(url, selector, reply) {
  url = url.trim();
  if(!/^https?:\/\//.test(url)) {
    url = "http://" + remainder;
  }

  var options = {
    url: url,
    jar: true
  };

  request(options, function(err, resp, html) {
    if(err) return reply(err);

    var res = cheerio(selector, html);
    console.log(res);
    reply(res.text().trim());

  });
}

module.exports.run_title = function(remainder, p, reply) {
  getSelector(remainder, 'title', reply);
};
module.exports.run_websel = function(r, p, reply) {
  getSelector(p[1], p[0], reply);
};
