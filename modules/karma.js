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

// todo: these are probably wrong somehow
var postinc = /([^\s\+-]+)\+\+/;
var preinc = /\+\+([^\s\+-]+)/;
var incfor = /([^\s\+-]+)\+\+\s+(\sfor)?\s+(.+)/;
var postdec = /([^\s\+-]+)--/;
var predec = /--([^\s\+-]+)/;
var decfor = /([^\s\+-]+)--\s*(\sfor)?\s+(.+)/;

// Watch for messages of the following forms
// dru++
// ++dru
// dru++ for some reason
// dru--
// --dru
// dru-- for some reason
module.exports.message = function(text, from, to, reply, raw) {
  var re;

  scoreboard[to] = scoreboard[to] || {};

  if (re = incfor.exec(text)) {
    var user = re[1],
      reason = re[2];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']++;
    scoreboard[to][user]['increasons'].push(reason);

    //    reply(user + " now has " + scoreboard[user]['points'] + " points (nth place!), including 1 for " + reason); // #todo nth place
    saveKarma();
  } 
  else if (re = preinc.exec(text) || postinc.exec(text)) {
    var user = re[1];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']++;

    //    reply(user + " now has " + scoreboard[user]['points'] + " points (nth place!)"); // #todo nth place
    saveKarma();
  }
  else if (re = decfor.exec(text)) {
    var user = re[1],
      reason = re[2];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']--;
    scoreboard[to][user]['decreasons'].push(reason);

    saveKarma();
  }
  else if (re = predec.exec(text) || postdec.exec(text)) {
    var user = re[1];

    scoreboard[to][user] = scoreboard[to][user] || { points: 0, reasons: [] };
    scoreboard[to][user]['points']--;

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
      users_and_scores.push([user, scoreboard[to][user]['points']]);
    }

    // Sort pairs by score: [["dru", 4], ["suroi", 53]]
    users_and_scores = users_and_scores.sort(function (a, b) {
      return a[1] <= b[1];
    });

    users_and_scores = users_and_scores.slice(0,3);
    var output = "";
    for (var i = 0; i < users_and_scores.length; i++) {
      output += users_and_scores[i][0] + ": " + users_and_scores[i][1] + ", ";
    }
    output = output.substring(0, output.length-2);

    reply(output);
  },

  karma: function(r, parts, reply, command, from, to) {
    var user = parts[0],
    points = 0;

    scoreboard[to] = scoreboard[to] || {};

    if (scoreboard[to][user]) {
      points = scoreboard[to][user]['points'];
    }

    reply(user + " has "  + points + " karma");
    // todo: point reasons
  }

};
