var Roll = require('roll');
var regex = /^(\d*)d(\d+|\%)(([\+\-\/\*b])(\d+))?$/;

module.exports.command = "roll";

function rollDice(str, cb) {
  if(!regex.test(str)) {
    return;
  }
  var dumbRoll = false;
  var m = regex.exec(str);
  if(m[2] == '1') {
    dumbRoll = true;
  }
  var res;
  try {
    var roll = new Roll()
    res = roll.roll(str);
  } catch(e) {
    return;
  }
  var s = res.result;
  if(dumbRoll) {
    s += ', BUT THAT IS A DUMB ROLL';
  } else if(res.rolled.length > 1) {
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
