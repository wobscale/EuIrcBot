var mathjs = require('mathjs');
var RC = require('regex-chain');

var bot = null;
var mathParser = mathjs.parser();

function MathScopeEval(str) {
  try {
    return mathParser.eval(str);
  } catch(ex) {
    return null;
  }
}

var REEscape = function(s) {
      return s.replace(/[\-\/\\^\$\*\+\?\.\(\)\|\[\]{}]/g, '\\$&');
};

// custom symbols
mathjs.epsilon = 8.854187817*Math.pow(10,-12);
mathjs.k = 8.987551787368*Math.pow(10,9);

var mathKeysToGet = Object.getOwnPropertyNames(mathjs);
var mathItems = {};
for(var i=0;i<mathKeysToGet.length;i++) {
  mathItems[mathKeysToGet[i]] = mathjs[mathKeysToGet[i]];
}

// Strings to not match; case insensitive fyi
var ignoreStrings = ["i'm g"];

//
// INPUT FULTERS
//
var mathKeys = Object.keys(mathItems);
var mathSymbols = ".,*+-/()%=";

var onlySymbols = new RC("^[\\s" + REEscape(mathSymbols) + "]*$");
var onlyNumbers = new RC(/^[\.\s\d]*$/);
var onlyKeys = new RC("^((" + mathKeys.join(")|(") + "))+$");
var onlyTime = new RC(/^(:?[0-9]+:?)+$/);
var onlyQuote = new RC(/^".+"$/);
var funnyFractions = new RC(/^(([0-9][0]?|11)\s*\/\s*(10|5|100))$/);
var plusN = new RC(/^\++\d+$/);
var webscaleQualityInputs = new RC(/^[a-zA-Z ]+$/);
var notNumeric = new RC(/^\s*not\s+[0-9\.]*$/);
var notNotMatrix = new RC(/^\s*not\s+\[.*$/); // not []
var notMatrixJunk = new RC(/^\s*:[^\]]+/); // D=1, :D

var ignoreRe = onlySymbols.or(onlyNumbers).or(funnyFractions).or(onlyKeys).or(plusN)
               .or(onlyQuote).or(onlyTime).or(webscaleQualityInputs).or(notNumeric)
               .or(notNotMatrix).or(notMatrixJunk);

//
// OUTPUT FILTERS
//
var javascript = new RC("function|{|}|return|arguments|length"); // This is by no means "good"

module.exports.init = function(b) {
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

module.exports.msg = function(text, from, reply, raw) {
  text = text.trim();

  if(ignoreRe.test(text)) {
    return;
  }

  if(ignoreStrings.indexOf(text) !== -1) {
    return;
  }

  var res = MathScopeEval(text);

  if(res === null) {
    return;
  }

  if(res.toString) {
    res = res.toString();
  } else {
    return;
  }

  var resclean = res.replace(/\s/g, '');
  var textclean = text.replace(/\s/g, '');

  // If res parrots our input, filter it
  if(res == text ||
     resclean == text ||
     res == textclean ||
     resclean == textclean ||
     differsOnlyByTrailingComment(textclean, resclean) ||
     differsOnlyByLeadingZeros(textclean, resclean) ||
     justAddsParens(textclean, resclean)) {
    return;
  }

  // If the response is javascript
  if(javascript.test(res)) {
    return;
  }

  // Truncate our responses (reckless-irc-exec)
  if(res.length < 400) {
    reply(res);
  }
  else {
    reply(res.substring(0,396) + " ...");
    bot.sayTo(from, 'All of your command output: ' + res);
  }
};

module.exports.command = "reset";

module.exports.run_reset = function(remainder, parts, reply) {
  // Create a new scope
  mathParser = mathjs.parser();
  reply("Parser reinitialized");
};

