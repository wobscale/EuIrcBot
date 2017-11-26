let url = require('url'),
  XRegExp = require('xregexp');

let tokenSplitRegex = XRegExp('(?![-_])[\\p{Pc}\\p{Pd}\\pZ]+'),
  tokenTrimBase = '(?![/])\\pP+',
  tokenTrimStart = XRegExp(`^${tokenTrimBase}`),
  tokenTrimEnd = XRegExp(`${tokenTrimBase}$`);

let bot;
module.exports.init = function (b) {
  bot = b;
};

module.exports.msg = function (text, from, reply, raw) {
  /* Avoid dupe urls in one line unless they really want it */
  const thisLinesUrls = [];

  text.split(tokenSplitRegex)
    .map((token) => {
      try {
        return url.parse(token.replace(tokenTrimStart, '').replace(tokenTrimEnd, ''));
      } catch (_) {}
    })
    .filter(u => u && u.protocol && u.host)
    .map(u => u.href)
    .forEach((u) => {
      if (thisLinesUrls.includes(u)) {
        bot.callModuleFn('dupeurl', [u, reply, text, from, raw]);
      } else {
        bot.callModuleFn('url', [u, reply, text, from, raw]);
      }
      thisLinesUrls.push(u);
    });
};

module.exports.url = function (url, reply, text) {
  // sample url function
};
