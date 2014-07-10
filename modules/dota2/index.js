var Dazzle = require('dazzle');
var dazzle = null;


module.exports.command = "dota2";

module.exports.init = function(bot) {
  bot.getConfig('dota2.json', function(err, conf) {
    if(err) return console.log("Unable to load dota2", err);

    dazzle = new Dazzle(conf.apiKey);
  });
};

module.exports.run = function(r, parts, reply) {
  if(dazzle === null) return console.log("Dota2 command, but not loaded");

  dazzle.getMatchDetails(parts[0], function(err, res) {
    var win = res.radiant_win ? "Radiant" : "Dire";
    var str = win + " win. ";

    //TODO, green and red text for radiant / dire.

    var players = res.players.map(function(player) {
      return {
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        gpm: player.gold_per_min,
        level: player.level,
        team: (player.player_slot >> 7) ? 'dire' : 'radiant',
        position: player.player_slot << 5
      };
    });

    players.sort(function(lhs, rhs) {
      if(lhs.team === rhs.team) return lhs.position - rhs.position;
      else if(lhs.team === 'radiant') return -1;
      else return 1;
    });

    reply(str + players.map(function(p) {
      if(p.team == 'radiant') return p.kills;
      return 0;
    }).reduce(function(l,r){return l+r;}) + ' - ' +
      players.map(function(p) {
      if(p.team == 'dire') return p.kills;
      return 0;
    }).reduce(function(l,r){return l+r;}));

    //TODO, do much more work.
    //reply(str + players.map(function(player) {
    //}));

  });
};
