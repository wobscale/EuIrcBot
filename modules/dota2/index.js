const Dazzle = require('dazzle');

let dazzle = null;


module.exports.command = 'dota2';

module.exports.init = function (bot) {
  bot.getConfig('dota2.json', (err, conf) => {
    if (err) return console.log('Unable to load dota2', err);

    dazzle = new Dazzle(conf.apiKey);
  });
};

module.exports.run = function (r, parts, reply) {
  if (dazzle === null) return console.log('Dota2 command, but not loaded');

  dazzle.getMatchDetails(parts[0], (err, res) => {
    const win = res.radiant_win ? 'Radiant' : 'Dire';
    const str = `${win} win. `;

    // TODO, green and red text for radiant / dire.

    const players = res.players.map(player => ({
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      gpm: player.gold_per_min,
      level: player.level,
      team: (player.player_slot >> 7) ? 'dire' : 'radiant',
      position: player.player_slot << 5,
    }));

    players.sort((lhs, rhs) => {
      if (lhs.team === rhs.team) return lhs.position - rhs.position;
      else if (lhs.team === 'radiant') return -1;
      return 1;
    });

    reply(`${str + players.map((p) => {
      if (p.team == 'radiant') return p.kills;
      return 0;
    }).reduce((l, r) => l + r)} - ${
      players.map((p) => {
        if (p.team == 'dire') return p.kills;
        return 0;
      }).reduce((l, r) => l + r)}`);

    // TODO, do much more work.
    // reply(str + players.map(function(player) {
    // }));
  });
};
