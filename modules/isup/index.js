var http = require('follow-redirects').http;
var https = require('follow-redirects').https;
var URI = require('uri-js');
var request = require('request');

module.exports.command = "isup";

function validateUrl(url) {
  var parsed = URI.parse(url);
  //Ignore errors, we can tank on.
  if(parsed.scheme === 'undefined' || parsed.reference === 'relative') {
    // Probably missing http://
    return 'http://' + url;
  }

  return url;
}

module.exports.run = function(remainder, p, reply) {
  remainder = remainder.trim();
  var url = validateUrl(remainder);
  var parsed = URI.parse(url);
  var getter = /^https/.test(url) ? https.get : http.get;

  if(/^https?$/.test(parsed.scheme)) {
    request({url: url, strictSSL: false}, function(error, response, body) {
      if(error) return reply(url + " didn't work, yo: " + error.toString());
      if(response.statusCode >= 200 && response.statusCode < 400) {
        return reply(url + " appears to be doing just fine.");
      } else {
        return reply(url + " is error with status code " + response.statusCode + '.');
      }
    });
  } else {
    reply(parsed.scheme + " is not supported yet. Open a pull request if you care that much");
  }
};

