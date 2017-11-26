module.exports.command = 'help';

// TODO make this work
module.exports.help = function () {
  return `Gives a list of commands and topics, or help about a specific command or topic. Usage: ${bot.config.commandPrefix}help [<command or topic>]`;
};


module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  return reply('Coming Soon^TM');
};
