module.exports.init = function(bot) {};

module.exports.name = "sirc-help";

module.exports.command = "help";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw, regex)
{
  reply("My parts are:", parts.join(', '));
};
