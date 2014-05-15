var http = require('follow-redirects').http;
var https = require('follow-redirects').https;
var URI = require('uri-js');

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
  getter(url, function(res) {

    var toSay = url;

    var finalUrl = parsed.scheme + "://" + res.req._headers.host + res.req.path;
    if(finalUrl != url) {
      toSay += " (-> " + finalUrl + ")";
    }
    if(res.statusCode >= 200 && res.statusCode <= 400) {
      toSay += " appears to be doing just fine.";
    } else {
      toSay += " is error with status code " + res.statusCode;
    }
    reply(toSay);
  }).on('error', function(err) {
    reply(url + " couldn't be dealt with: " + err.toString());
  });
};

