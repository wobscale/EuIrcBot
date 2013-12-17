var roll = require('roll');
var regex = /^(\d*)d(\d+|\%)(([\+\-\/\*b])(\d+))?$/;

module.exports.command = "roll";

function rollDice(str, cb) {
  if(!regex.test(str)) {
    return;
  }
  var res;
  try {
    res = roll.roll(str);
  } catch(e) {
    return;
  }
  var s = res.result;
  if(res.rolled.length > 1) {
    s += ": Rolled " + res.rolled.join(", ");
  }
  cb(s);
}

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  rollDice(remainder, reply);
};

module.exports.msg = function(text, from, reply, raw) {
  rollDice(text, reply);
};
