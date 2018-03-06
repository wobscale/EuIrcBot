const _ = require('underscore');

let bot;

let commandDict = null;
let allowCmds = false;

function writeCommands() {
  bot.writeDataFile('commands.json', JSON.stringify(commandDict), (err) => {
    if (err) bot.log.error(`Error writing command file: ${err}`);
  });
}

module.exports.init = function dumbCommandInit(b) {
  bot = b;
  bot.readDataFile('commands.json', (err, jsonData) => {
    if (err) {
      bot.log.info('Initializing commandDict');
      commandDict = {};
    } else {
      try {
        commandDict = JSON.parse(jsonData);
      } catch (ex) {
        bot.log.warn('Corrupted commands.json file! Resetting dict...');
        commandDict = {};
      }

      // Convert to new db format
      if (_.size(commandDict) > 0 && !Object.prototype.hasOwnProperty.call(_.values(commandDict)[0], 'blame')) {
        commandDict = _.mapObject(commandDict, (val) => {
          const data = {};
          data.command = val;
          data.blame = 'jruby'; // blame merr
          return data;
        });
      }
    }
    writeCommands();
  });

  bot.getConfig('dumbcommand.json', (err, conf) => {
    if (!err) {
      allowCmds = conf.allow_commands;
    }
  });
};


module.exports.any_command = function dumbCommandCommands(remainder, parts, reply, command) {
  if (commandDict[command]) reply(commandDict[command].command);
};

module.exports.commands = {
  dumbcommand: {
    _default(x, y, reply) {
      reply('Usage: dumbcommand [<add>|<remove>|<list>|<blame>|<rblame>] <command> [<text>]');
    },
    add(r, parts, reply, command, from) {
      if (parts.length !== 2) return reply('add must have *exactly* two arguments');
      if (!allowCmds && (/^!/m).test(parts[1])) return reply('None of that, now.');
      const exists = commandDict[parts[0]];
      commandDict[parts[0]] = {};
      commandDict[parts[0]].command = parts[1];
      commandDict[parts[0]].blame = from;

      if (exists) reply(`Overwrote command ${parts[0]}`);
      else reply(`Added command ${parts[0]}`);

      return writeCommands();
    },
    blame(r, parts, reply) {
      if (parts.length !== 1) return reply('please specify a command to blame');
      if (typeof commandDict[parts[0]] === 'undefined') return reply('No such command');
      return reply(`Blame ${commandDict[parts[0]].blame} for this`);
    },
    rblame(r, parts, reply) {
      if (parts.length !== 1) return reply('please specify a user to blame');
      const commandArr = Object.entries(commandDict)
        .filter(([, command]) => command.blame === parts[0])
        .map(([name]) => name);
      if (commandArr.length > 0) return reply(`${parts[0]} is responsible for ${commandArr.join(', ')}`);
      return reply(`${parts[0]} has not made any dumbcommands`);
    },
    remove(r, parts, reply) {
      if (parts.length !== 1) return reply('remove must have *exactly* one argument');

      if (typeof commandDict[parts[0]] === 'undefined') return reply('No such command');

      delete commandDict[parts[0]];
      reply(`Removed command ${parts[0]}`);

      return writeCommands();
    },
    list(x, parts, reply) {
      if (parts.length === 0) {
        reply(`Commands: ${Object.keys(commandDict).join(',')}`);
      } else {
        reply(parts.map(key => (commandDict[key] ? `${key} -> ${commandDict[key]}` : ''))
          .filter(item => item.length > 0).join(' | '));
      }
    },
  },
};
