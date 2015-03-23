var bot;

var scoreboard = {};

loadKarma = function(cb) {
  bot.fsGetData('karma', 'karma.json', function(err, res) {
    if(err) {
      console.log("Error loading karma data " + err);
      scoreboard = {};
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
module.exports.message = function(text, from, to, reply, raw) {
  var re;

  scoreboard[to] = scoreboard[to] || {};

  if (re = incfor.exec(text)) {
    var user = re[0],
      reason = re[2];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']++;
    scoreboard[to][user]['increasons'].push(reason);

    console.log("incfor " + to + " " + user + " " + scoreboard[to][user]['points']);
    //    reply(user + " now has " + scoreboard[user]['points'] + " points (nth place!), including 1 for " + reason); // #todo nth place
    saveKarma();
  } 
  else if (re = inc.exec(text)) {
    var user = re[0];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']++;

    console.log("inc " + to + " " + user + " " + scoreboard[to][user]['points']);
    //    reply(user + " now has " + scoreboard[user]['points'] + " points (nth place!)"); // #todo nth place
    saveKarma();
  }
  else if (re = decfor.exec(text)) {
    var user = re[0],
      reason = re[2];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']--;
    scoreboard[to][user]['decreasons'].push(reason);
    console.log("decfor " + to + " " + user + " " + scoreboard[to][user]['points']);
    saveKarma();
  }
  else if (re = dec.exec(text)) {
    var user = re[0];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']--;
    console.log("dec " + to + " " + user + " " + scoreboard[to][user]['points']);
    saveKarma();
  }
};

module.exports.commands = {

  top3: function(r, parts, reply, command, from, to) { // todo: use regex parsed commands to implement topN
    var users_and_scores = [],
    rank = 1;

    scoreboard[to] = scoreboard[to] || {};

    // yolo js
    for (var user in scoreboard[to]) {
      users_and_scores.append([user, scoreboard[to][user]['points']]);
    }

    // Sort pairs by score: [["dru", 4], ["suroi", 53]]
    users_and_scores = users_and_scores.sort(function (a, b) {
      return a[1] <= b[1];
    });

    var output = "";
    for (var line_data in users_and_scores.slice(0,2)) {
      output += line_data[0] + ": " + line_data[1] + ", ";
    }
    output += "\b\b";

    reply(output);
  },

  karma: function(r, parts, reply, command, from, to) {
    var user = parts[0],
    points = 0;

    scoreboard[to] = scoreboard[to] || {};

    if (scoreboard[to][user]) {
      points = scoreboard[to][user]['points'];
    }

    console.log(user + " " + to + " " + scoreboard);
    reply(user + " has "  + points + " karma");
    // todo: point reasons
  }

};
