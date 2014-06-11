module.exports.command = 'help';
var bot;
module.exports.init = function(b) { bot = b; };

// TODO make this work
module.exports.help = function(){
  return "Gives a list of commands and topics, or help about a specific command or topic. Usage: " + bot.config.commandPrefix + "help [<command or topic>]";
};

function getCommands(t) {
  return Object.keys(t.getAllCommandFns());
}

function extraTopics() {
  // TODO
  return '';
}

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  if(parts.length === 0) {
    var replyStr = 'Commands: ' + getCommands(this).join(', ');
    var extra = extraTopics();
    if(extra.length > 0) {
      replyStr += ', Extra help topics: ' + extra.join(', ');
    }
    return reply(replyStr + '.');
  } else {
    // TODO
  }
};
