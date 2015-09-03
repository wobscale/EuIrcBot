var mathjs = require('mathjs');

function MathScopeEval(str) {
  try {
    var result = mathjs.eval(str);
    return mathjs.eval(str);
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

var mathKeys = Object.keys(mathItems);
var mathSymbols = ".,*+-/()%=";

var onlySymbols = new RC("^[\\s" + REEscape(mathSymbols) + "]*$");
var onlyNumbers = new RC(/^[\.\s\d]*$/);
var onlyKeys = new RC("^\\s*((" + mathKeys.join(")|(") + "))+\\s*$");
var onlyTime = new RC(/^\s*([0-9]+:?)+\s*$/);
var onlyQuote = new RC(/^".+"$/);
var funnyFractions = new RC(/^\s*(([0-9][0]?|11)\s*\/\s*(10|5|100))\s*$/);
var plusN = new RC(/^\s*\++\d+\s*$/);

var ignoreRe = onlySymbols.or(onlyNumbers).or(funnyFractions).or(onlyKeys).or(plusN)
               .or(onlyQuote).or(onlyTime);


module.exports.msg = function(text, from, reply, raw) {
  var res = MathScopeEval(text);
  if(res !== null) {
    reply(res);
  }
};
