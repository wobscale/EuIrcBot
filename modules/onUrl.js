var url = require('url')
  , XRegExp = require('xregexp');

var tokenSplitRegex = XRegExp('(?![-_])[\\p{Pc}\\p{Pd}\\pZ]+')
  , tokenTrimBase = '(?![/])\\pP+'
  , tokenTrimStart = XRegExp('^' + tokenTrimBase)
  , tokenTrimEnd = XRegExp(tokenTrimBase + '$');

var bot;
module.exports.init = function(b) {
  bot = b;
};

module.exports.msg = function(text, from, reply, raw) {
  /* Avoid dupe urls in one line unless they really want it */
  var thisLinesUrls = [];

  text.split(tokenSplitRegex)
    .map((token) => url.parse(
      token.replace(tokenTrimStart, '').replace(tokenTrimEnd, '')))
    .filter((u) => u.protocol && u.host)
    .map((u) => u.href)
    .forEach((u) => {
      if (thisLinesUrls.includes(u)) {
        bot.callModuleFn('dupeurl', [u, reply, text, from, raw]);
      } else {
        bot.callModuleFn('url', [u, reply, text, from, raw]);
      }
      thisLinesUrls.push(u);
    });
};

module.exports.url = function(url, reply, text) {
  // sample url function
};
