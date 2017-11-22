let bot;

module.exports.name = 'sirc-joinchannel';

module.exports.init = function (b) {
  bot = b;
  channels = [];
  bot.readDataFile('channels.txt', (err, data) => {
    if (err) return console.log(err);
    data.toString().split('\n').forEach((channel) => {
      if (channel.length > 0) {
        bot.client.join(channel);
      }
    });
  });
};

/* This simple module is partially meant to
 * show off the {name: function} dict that
 * can be used by a module to define commands
 */
module.exports.commands = {
  join(channel) {
    bot.client.join(channel);
    bot.appendDataFile('channels.txt', `${channel}\n`, (err) => {
      if (err) console.log(err);
    });
  },
};

