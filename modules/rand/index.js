module.exports.command = "rand";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var choices = remainder.split( " " );
  reply( choices[Math.floor(Math.random() * choices.length)] );
};
