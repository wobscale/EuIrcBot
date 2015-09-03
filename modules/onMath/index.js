var mathjs = require('mathjs');
var RC = require('regex-chain');

function MathScopeEval(str) {
  try {
    var result = mathjs.eval(str);
    return mathjs.eval(str);
  } catch(ex) {
    return null;
  }
}

var mathKeysToGet = Object.getOwnPropertyNames(Math);
var mathItems = {};
for(var i=0;i<mathKeysToGet.length;i++) {
  mathItems[mathKeysToGet[i]] = Math[mathKeysToGet[i]];
}
mathItems.TAU = Math.PI * 2;
mathItems.fact = function(num) {
    var rval=1;
    for (var i = 2; i <= num; i++) {
        rval = rval * i;
    }
    return rval;
};

var mathKeys = Object.keys(mathItems);
var mathSymbols = ".,*+-/()%=";

var onlySymbols = new RC("^[\\s" + REEscape(mathSymbols) + "]*$");
var onlyNumbers = new RC(/^[\.\s\d]*$/);
var onlyKeys = new RC("^\\s*((" + mathKeys.join(")|(") + "))+\\s*$");
var onlyTime = new RC(/^\s*([0-9]+:?)+\s*$/);
var onlyQuote = new RC(/^".+"$/);
var funnyFractions = new RC(/^\s*(([0-9][0]?|11)\s*\/\s*(10|5|100))\s*$/);
var plusN = new RC(/^\s*\++\d+\s*$/);

var ignoreRe = onlySymbols.or(onlyNumbers).or(funnyFractions).or(onlyKeys).or(plusN).or(onlyQuote);


module.exports.msg = function(text, from, reply, raw) {
  if(ignoreRe.test(text)) {
    return;
  }

  var res = MathScopeEval(text);

  if(res !== null) {
    reply(res);
  }
};
