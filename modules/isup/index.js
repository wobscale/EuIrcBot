const http = require('follow-redirects').http;
const https = require('follow-redirects').https;
const URI = require('uri-js');
const request = require('request');

module.exports.command = 'isup';

function validateUrl(url) {
  const parsed = URI.parse(url);
  // Ignore errors, we can tank on.
  if (parsed.scheme === 'undefined' || parsed.reference === 'relative') {
    // Probably missing http://
    return `http://${url}`;
  }

  return url;
}

module.exports.run = function (remainder, p, reply) {
  remainder = remainder.trim();
  const url = validateUrl(remainder);
  const parsed = URI.parse(url);
  const getter = /^https/.test(url) ? https.get : http.get;

  if (/^https?$/.test(parsed.scheme)) {
    request({ url, strictSSL: false }, (error, response, body) => {
      if (error) return reply(`${url} didn't work, yo: ${error.toString()}`);
      if (response.statusCode >= 200 && response.statusCode < 400) {
        return reply(`${url} appears to be doing just fine.`);
      }
      return reply(`${url} is error with status code ${response.statusCode}.`);
    });
  } else {
    reply(`${parsed.scheme} is not supported yet. Open a pull request if you care that much`);
  }
};

