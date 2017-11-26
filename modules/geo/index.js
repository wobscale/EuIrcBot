const g = require('googlemaps');

module.exports.command = 'geo';

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  g.geocode(remainder, (err, data) => {
    if (err) {
      reply('Could not find.');
    } else {
      const loc = data.results[0].geometry.location;
      reply(`Located @ ${loc.lat}, ${loc.lng}`);
    }
  });
};
