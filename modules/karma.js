var bot;

var scoreboard = {};

loadKarma = function(cb) {
  bot.fsGetData('karma', 'karma.json', function(err, res) {
    if(err) {
      console.log("Error loading karma data " + err);
      return;
    }

    scoreboard = JSON.parse(res);

    cb && cb();
  });
}

saveKarma = function(cb) {
  bot.fsStoreData('karma', 'karma.json', JSON.stringify(scoreboard), function() {
    cb && cb();
  });
}

module.exports.init = function(b) {
  bot = b;
  loadKarma();
};

var inc = /(\w+)\+\+/;
var incfor = /(\w+)\+\+\s+(\sfor)?\s+(.+)/;
var dec = /(\w+)--/;
var decfor = /(\w+)--\s*(\sfor)?\s+(.+)/;

// Watch for messages of the following forms
// dru++
// dru++ for some reason
module.exports.msg = function(text, from, reply, raw) {
  var re;

  scoreboard[from] = scoreboard[from] || {};

  if (re = incfor.exec(text)) {
    var user = re[0],
      reason = re[2];

    this.scoreboard[from][user] = this.scoreboard[from][user] || { points: 0, reasons: [] };
    this.scoreboard[from][user]['points']++;
    this.scoreboard[from][user]['increasons'].push(reason);

    //    reply(user + " now has " + this.scoreboard[user]['points'] + " points (nth place!), including 1 for " + reason); // #todo nth place
    saveKarma();
  } 
  else if (re = inc.exec(text)) {
    var user = re[0];

    this.scoreboard[from][user] = this.scoreboard[from][user] || { points: 0, reasons: [] };
    this.scoreboard[from][user]['points']++;

    //    reply(user + " now has " + this.scoreboard[user]['points'] + " points (nth place!)"); // #todo nth place
    saveKarma();
  }
  else if (re = decfor.exec(text)) {
    var user = re[0],
      reason = re[2];

    this.scoreboard[from][user] = this.scoreboard[from][user] || { points: 0, reasons: [] };
    this.scoreboard[from][user]['points']--;
    this.scoreboard[from][user]['decreasons'].push(reason);
    saveKarma();
  }
  else if (re = dec.exec(text)) {
    var user = re[0];

    this.scoreboard[from][user] = this.scoreboard[from][user] || { points: 0, reasons: [] };
    this.scoreboard[from][user]['points']--;
    saveKarma();
  }
};

module.exports.commands = {

  top3: function(r, parts, reply, command, from) { // todo: use regex parsed commands to implement topN
    var users_and_scores = [],
    rank = 1;

    this.scoreboard[from] = this.scoreboard[from] || {};

    // yolo js
    for (var user in this.scoreboard[from]) {
      users_and_scores.append([user, this.scoreboard[from][user]['points']]);
    }

    // Sort pairs by score: [["dru", 4], ["suroi", 53]]
    users_and_scores = users_and_scores.sort(function (a, b) {
      return a[1] <= b[1];
    });

    var output = "";
    for (var line_data in users_and_scores.slice(0,2)) {
      output += line_data[0] + ": " + line_data[1] + ", ");
    }
    output += "\b\b";

    reply(output);
  },

  karma: function(r, parts, reply, command, from) {
    var user = parts[0],
    points = 0;

    this.scoreboard[from] = this.scoreboard[from] || {};

    if (this.scoreboard[from][user]) {
      points = this.scoreboard[from][user]['points'];
    }

    reply(user + " has "  + points + " karma");
    // todo: point reasons
  }

};
