const mathjs = require('mathjs');
const RC = require('regex-chain');

let bot = null;
let mathParser = mathjs.parser();

function MathScopeEval(str) {
  try {
    return mathParser.eval(str);
  } catch (ex) {
    return null;
  }
}

const REEscape = function (s) {
  return s.replace(/[\-\/\\^\$\*\+\?\.\(\)\|\[\]{}]/g, '\\$&');
};

// custom symbols
mathjs.epsilon = 8.854187817 * Math.pow(10, -12);
mathjs.k = 8.987551787368 * Math.pow(10, 9);

const mathKeysToGet = Object.getOwnPropertyNames(mathjs);
const mathItems = {};
for (let i = 0; i < mathKeysToGet.length; i++) {
  mathItems[mathKeysToGet[i]] = mathjs[mathKeysToGet[i]];
}

// Strings to not match; case insensitive fyi
const ignoreStrings = ["i'm g"];

//
// INPUT FULTERS
//
const mathKeys = Object.keys(mathItems);
const mathSymbols = '.,*+-/()%=';

const onlySymbols = new RC(`^[\\s${REEscape(mathSymbols)}]*$`);
const onlyNumbers = new RC(/^[\.\s\d]*$/);
const onlyKeys = new RC(`^((${mathKeys.join(')|(')}))+$`);
const onlyTime = new RC(/^(:?[0-9]+:?)+$/);
const onlyQuote = new RC(/^".+"$/);
const funnyFractions = new RC(/^(([0-9][0]?|11)\s*\/\s*(10|5|100))$/);
const plusN = new RC(/^\++\d+$/);
const webscaleQualityInputs = new RC(/^[a-zA-Z ]+$/);
const notNumeric = new RC(/^\s*not\s+[0-9\.]*$/);
const notNotMatrix = new RC(/^\s*not\s+\[.*$/); // not []
const notMatrixJunk = new RC(/^\s*:[^\]]+/); // D=1, :D

const ignoreRe = onlySymbols.or(onlyNumbers).or(funnyFractions).or(onlyKeys).or(plusN)
  .or(onlyQuote)
  .or(onlyTime)
  .or(webscaleQualityInputs)
  .or(notNumeric)
  .or(notNotMatrix)
  .or(notMatrixJunk);

//
// OUTPUT FILTERS
//
const javascript = new RC('function|{|}|return|arguments|length'); // This is by no means "good"

module.exports.init = function (b) {
  bot = b;
};

function justAddsParens(before, after) {
  return before.toLowerCase().replace(/[()]/g, '') === after.toLowerCase().replace(/[()]/g, '');
}

function differsOnlyByLeadingZeros(before, after) {
  return before.replace(/^0*/, '') === after.replace(/^0*/, '');
}

function differsOnlyByTrailingComment(before, after) {
  return cleanText(before.replace(/#.*$/, '')) === cleanText(after.replace(/#.*$/, ''));
}

function cleanText(text) {
  return text.replace(/"|\s/g, '');
}

module.exports.msg = function (text, from, reply, raw) {
  text = text.trim();

  if (ignoreRe.test(text)) {
    return;
  }

  if (ignoreStrings.indexOf(text) !== -1) {
    return;
  }

  let res = MathScopeEval(text);

  if (res === null) {
    return;
  }

  if (res.toString) {
    res = res.toString();
  } else {
    return;
  }

  const resclean = res.replace(/\s/g, '');
  const textclean = text.replace(/\s/g, '');

  // If res parrots our input, filter it
  if (res == text ||
     resclean == text ||
     res == textclean ||
     resclean == textclean ||
     differsOnlyByTrailingComment(textclean, resclean) ||
     differsOnlyByLeadingZeros(textclean, resclean) ||
     justAddsParens(textclean, resclean)) {
    return;
  }

  // If the response is javascript
  if (javascript.test(res)) {
    return;
  }

  // Truncate our responses (reckless-irc-exec)
  if (res.length < 400) {
    reply(res);
  } else {
    reply(`${res.substring(0, 396)} ...`);
    bot.sayTo(from, `All of your command output: ${res}`);
  }
};

module.exports.command = 'reset';

module.exports.run_reset = function (remainder, parts, reply) {
  // Create a new scope
  mathParser = mathjs.parser();
  reply('Parser reinitialized');
};

