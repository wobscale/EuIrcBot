var bot;

var commandDict = null;

function writeCommands() {
  bot.writeDataFile("commands.json", JSON.stringify(commandDict), function(err) {
    if(err) console.log("Error writing command file: " + err);
  });
}

module.exports.init = function(b) {
  bot = b;
  bot.readDataFile("commands.json", function(err, data) {
    if(err) {
      console.log("Initializing commandDict");
      commandDict = {};
    } else {
      try {
        commandDict = JSON.parse(data);
      } catch(ex) {
        console.log("Corrupted commands.json file! Resetting dict...");
        commandDict = {};
      }
    }
    writeCommands();
  });
};


module.exports.any_command = function(remainder, parts, reply, command) {
  if(commandDict[command]) reply(commandDict[command]);
};

module.exports.commands = {
  dumbcommand: {
    _default: function(x,y,reply) {
      reply("Usage: dumbcommand [<add>|<remove>|<list>] <command> [<text>]");
    },
    add: function(r, parts, reply) {
      if(parts.length !== 2) return reply("add must have *exactly* two arguments");
      if(parts[1].charAt(0) === '!') return reply ("You are an asshole");
	  var exists = commandDict[parts[0]];
      commandDict[parts[0]] = parts[1];

      if(exists) reply("Overwrite command " + parts[0]);
      else reply("Added command " + parts[0]);

      writeCommands();
    },
    remove: function(r, parts, reply) {
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");

      if(typeof commandDict[parts[0]] === 'undefined') return reply("No such command");

      delete commandDict[parts[0]];
      reply("Removed command " + parts[0]);

      writeCommands();
    },
    list: function(x,parts,reply) {
      if(parts.length === 0) {
        reply("Commands: " + Object.keys(commandDict).join(","));
      } else {
        reply(parts.map(function(key) { return commandDict[key] ? key + " -> " + commandDict[key] : ''; })
        .filter(function(item) { return item.length > 0; }).join(" | "));
      }
    }
  }
};
