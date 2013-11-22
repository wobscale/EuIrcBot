
var bot;

module.exports.init = function(b) {
  bot = b;
};

/* This simple module is partially meant to
 * show off the {name: function} dict that
 * can be used by a module to define commands
 */
module.exports.commands = {
  join: function(channel) {
    bot.client.join(channel);
  }
};

