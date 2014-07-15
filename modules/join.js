var bot;

module.exports.name = "sirc-joinchannel";

module.exports.init = function(b) {
  bot = b;
  channels = [];
  bot.readDataFile('channels.txt', function(err, data) {
    if(err) return console.log(err);
    data.toString().split("\n").forEach(function(channel) {
      if(channel.length > 0) {
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
  join: function(channel) {
    bot.client.join(channel);
    bot.appendDataFile("channels.txt", channel + "\n", function(err) {
      if(err) console.log(err);
    });
  }
};

