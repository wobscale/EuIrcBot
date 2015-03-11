/* This module is intended to detect lines
 * that contain only math and then evaluate
 * it and return the result.
 * It is possibly insecure, but I have yet to find a way
 * to exploit it.
 */

var RC = require('regex-chain');

var REEscape = function(s) {
    return s.replace(/[\-\/\\^\$\*\+\?\.\(\)\|\[\]{}]/g, '\\$&');
};

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

function MathScopeEval(str) {
  try {
    return (new Function("with(this) { return "+str+"; }")).call(mathItems);
  } catch(ex) {
    return null;
  }
}

function constructMathRe() {
  var re = new RegExp("^((?:\\d*(?:\\.\\d+)?(e\\d+)?)|[\\s" + REEscape(mathSymbols) + "]|(" + mathKeys.join(")|(") + "))+$");
  return re;
}

var mathRe = constructMathRe();

var onlySymbols = new RC("^[\\s" + REEscape(mathSymbols) + "]*$");
var onlyNumbers = new RC(/^[\.\s\d]*$/);
var onlyKeys = new RC("^\\s*((" + mathKeys.join(")|(") + "))+\\s*$");
var funnyFractions = new RC(/^\s*([0-9][0]?\s*\/\s*(10|5|100))\s*$/);
var plusN = new RC(/^\s*\++\d+\s*$/);

var ignoreRe = onlySymbols.or(onlyNumbers).or(funnyFractions).or(onlyKeys).or(plusN);

module.exports.msg = function(text, from, reply, raw) {
  if(ignoreRe.test(text)) {
    return;
  }
  if(mathRe.test(text)) {
    var res = MathScopeEval(text);
    if(res !== null) {
      reply(res);
    }
  }
};
