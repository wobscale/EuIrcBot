const { URL } = require('url');
const XRegExp = require('xregexp');

const tokenSplitRegex = XRegExp('(?![-_])[\\p{Pc}\\p{Pd}\\pZ]+');
const tokenTrimBase = '(?![/])\\pP+';
const tokenTrimStart = XRegExp(`^${tokenTrimBase}`);
const punctRegex = XRegExp(tokenTrimBase);

let bot;
module.exports.init = function (b) {
  bot = b;
};

function startChar(ch) {
  const mapping = [
    ['(', ')'],
    ['{', '}'],
    ['[', ']'],
    ['«', '»'],
    ['「', '」'],
    ['『', '』'],
  ];
  for (let i = 0; i < mapping.length; i += 1) {
    const key = mapping[i][0];
    const value = mapping[i][1];
    if (ch === key || ch === value) {
      return key;
    }
  }
  return null;
}
function isBalanced(ch, chs) {
  const start = startChar(ch);
  if (!start) {
    // not a balance-able character
    return false;
  }
  if (start === ch) {
    // if the character passed is a start character, you can't be balanced
    // Something like 'foo(' cannot be balanced no matter what, and 'ch' is
    // always a trailing character.
    return false;
  }
  let balance = 0;
  for (let i = 0; i < chs.length; i += 1) {
    if (chs[i] === start) {
      balance += 1;
    } else if (chs[i] === ch) {
      balance -= 1;
    }
    if (balance < 0) {
      // something like '(too-many-close))'
      return false;
    }
  }
  return balance === 0;
}

function trimUnbalancedPunct(s) {
  const arr = Array.from(s); // better unicode handling
  let i = arr.length - 1;
  for (; i >= 0; i -= 1) {
    if (punctRegex.test(arr[i])) {
      if (isBalanced(arr[i], arr.slice(0, i + 1))) {
        break;
      }
    } else {
      break;
    }
  }
  return arr.slice(0, i + 1).join('');
}

module.exports.msg = function (text, from, reply, raw) {
  /* Avoid dupe urls in one line unless they really want it */
  const thisLinesUrls = [];

  text.split(tokenSplitRegex)
    .map((token) => {
      const trimmedFront = token.replace(tokenTrimStart, '');
      const trimmed = trimUnbalancedPunct(trimmedFront);
      try {
        return new URL(trimmed);
      } catch (_) {
        return null;
      }
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

module.exports.url = function (url, reply, text) { // eslint-disable-line no-unused-vars
  // sample url function
};
