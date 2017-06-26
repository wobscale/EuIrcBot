module.exports.name = "sirc-testlog";
module.exports.command = "testlog";


module.exports.run = function(remainder, parts, reply, command, from, to, text, raw, regex) {
  if(p.length == 2) {
    this.log[p[0]](p[1]);
    reply("logged at " + p[0]);
  } else {
    this.log.info(r);
    reply("logged at info");
  }
};
