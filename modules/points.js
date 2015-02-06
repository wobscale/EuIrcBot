var bot;
module.exports.init = function(b) {
  bot = b;
};

module.exports.scoreboard = {};

var xplusplus = /(\w+)\+\+/;
var xplusplusfory = /(\w+)\+\+ (for)? (.*)/;

// Watch for messages of the following forms
// dru++
// dru++ for some reason
module.exports.msg = function(text, from, reply, raw) {
  var re;
  
  if (xplusplusfory.exec(text)) {
    var user = re[0],
      reason = re[2];

    this.scoreboard[user] = this.scoreboard[user] || { points: 0, reasons: [] };
    this.scoreboard[user]['points']++;
    this.scoreboard[user]['reasons'].push(reason);

  } elsif (xplusplus.exec(text)) {
    var user = re[0];

    this.scoreboard[user] = this.scoreboard[user] || { points: 0, reasons: [] };
    this.scoreboard[user]['points']++;
  }
};

module.exports.commands = {

	top10: function(r, parts, reply) {
		reply("top 10 is:");
	},

	score: function(r, parts, reply) {
	  var user = parts[0];
	  
    reply("random reason from " + user);
	}

};
