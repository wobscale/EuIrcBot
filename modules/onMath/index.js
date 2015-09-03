var mathjs = require('mathjs');

function MathScopeEval(str) {
  try {
    var result = mathjs.eval(str);
    return mathjs.eval(str);
  } catch(ex) {
    return null;
  }
}

module.exports.msg = function(text, from, reply, raw) {
  var res = MathScopeEval(text);
  if(res !== null) {
    reply(res);
  }
};
