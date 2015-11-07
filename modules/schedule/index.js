var later  = require('later');
var hash   = require('json-hash');
var moment = require('moment');

var bot;

var minimumInterval = 0; 
var noCommands = false;

//FIXME: this is gross vv
var schedules = [];
var timers = {};

function writeSchedule(data) {
  bot.writeDataFile("later.json", 
      JSON.stringify({'data': data}), function(err) {
        if(err) console.log("Error writing command file: " + err);
  });
}

function newSchedule(data) {
  var s;

  try {
    s = later.parse.text(data['schedule']);
  } catch (ex) {
    return ex;
  }

  // FIXME: change to > -1, @ char #
  if( s == 0 )
    return "Provided schedule query doesn't parse.";
  
  data['schedule'] = s;

  // check that command is valid
  //   - check if commands are disabled
  //   - doesn't call schedule
  //   - doesn't call a dumbcommand which calls schedule
  //     * checked via perceived caller
  // check frequency is below some minimum (config)
  
  if(noCommands && data.command.substring(0, bot.config.commandPrefix.length) 
      == bot.config.commandPrefix) 
    return "Commands are disabled";

  if(data['command'].match(/^!schedule/))
    return "Fuck you"; // FIXME: personalize

  if(data['blame'] == bot.client.nick)
    return "Cannot call scheduler recursively.";
  
  if(minimumInterval > 0 && schedules.length > 0 
      && moment().diff(schedules.slice(-1)[0].created, 'seconds') <= minimumInterval)
    return "Schedule creation is rate limited. Please wait at least " + minimumInterval
           + " seconds between schedule creation.";

  registerCommand(data);

  schedules.push(data);
  writeSchedule(schedules);
}

function registerCommand(data) {
  var command;

  //If it's a command, emulate being sent a command. Otherwise say it.
  command = function() {
    //FIXME: Properly emulate raw.
    bot.sayTo(data['channel'], data['command']); // say to channel even for own commands
    bot.client.emit('message', bot.client.nick, data['channel'], 
      data['command'], data['command']);
  };

  timers[hash.digest(data)] = later.setInterval(command, data['schedule']);
}

module.exports.init = function(b) {
  bot = b;
  bot.readDataFile("later.json", function(err, data) {
    console.log("Read data file w/ error '" + err + "'");
    if(err) {
      console.log("Initializing later.json");
      schedules = [];
      writeSchedule(schedules);
    } else {
      try {
        console.log("Parsing later.json...");
        schedules = JSON.parse(data)['data'];

        // process schedules
        schedules.forEach(function(e, i, d) {
          e['created'] = moment(e['created']);
          registerCommand(e);
        });
      } catch(ex) {
        console.log("Error parsing: " + ex);
        console.log("Corrupted later.json for schedule! Resetting file...");
        schedules = [];
        writeSchedule(schedules);
      }
    }
  });

  bot.getConfig("schedule.json", function(err, conf) {
    if(!err) {
      minimumInterval = conf.minimum_interval;
      noCommands = conf.no_commands;
    }
  });
};

module.exports.commands = {
  schedule: {
    _default: function(x,y,reply) {
      reply("Usage: !schedule [<add>|<remove>|<list>|<help>] [arguments]");
      reply("       Also see !schedule help <subcommand> for more details");
    },
    help: {
      _default: null, // to be aliased later to ^
      add: function(x,y,reply) {
        reply("Usage: !schedule add \"timeframe\" \"command or text\"");
        reply("       Timeframe syntax is here: http://bunkat.github.io/later/parsers.html#text");
        reply("       If a valid command isn't specified, it is treated as text to print.");
      },
      remove: function(x,y,reply) {
        reply("Usage: !schedule remove [hash|LAST]");
        reply("       Removes the schedule specified by the hash or the LAST one added.");
      },
      list: function(x,y,reply) {
        reply("Usage: !schedule list [offset=0]");
        reply("       Provides a list of schedules, in pages, from the specified offset of 0.");
      },
    },
    add: function(r, parts, reply, command, from, to, text, raw) {
      if(parts.length !== 2) return reply("add must have *exactly* two arguments");

      // check and add schedule
      var err = newSchedule({
        'blame': from,
        'created': new moment(),
        'schedule': parts[0],
        'command': parts[1],
        'channel': to
      });

      if(err)
        reply(err);
      else
        reply("Added");
    },
    list: function(x, parts, reply, command, from, to) {
      var offset = 0;
      var oi = offset;
      var count  = 5;
      var ci     = count;

      if(parts.length >= 1)
        oi = offset = parseInt(parts[0]);

      schedules.forEach( function(e,i,d) {
        if(oi != 0)
          oi -= 1;
        else if(ci > 0)
        {
          var message = hash.digest(e).substr(0,8);
          message += "     " + e["blame"] + "     " + e["created"];
          message += "     " + e["channel"];
          bot.sayTo(from, message);

          message =  "     ";
          if( e["command"].match(/^!/) )
            message += "command: " + e["command"];
          else
            message += "say: " + e["command"];
          bot.sayTo(from, message);

          ci -= 1;
        }
      });

      var message = "Displayed schedules " + (offset+1) + "-";
      if(count+offset > schedules.length)
      {
        count = schedules.length-offset;
      }

      message += (offset+count) + " of " + schedules.length;
      bot.sayTo(from, message);
    },

    remove: function(r, parts, reply) {
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");
      //FIXME: Do a hash lookup here instead of a linear search
      //FIXME: Switch to indicies
      
      var index = null;
      var hmatch = null;

      if(schedules.length == 0)
        return reply("There are no schedules to delete.");

      if(parts[0].match(/^LAST$/i))
      {
        index  = schedules.length-1;
        hmatch = hash.digest(schedules[index]);
      }
      else
      {
        schedules.forEach(function(e,i,d) {
          var h = hash.digest(e);
          if(h.substr(0,8) == parts[0])
          {
            index = i;
            hmatch = h;
          }
        });

        if(index == null)
          return reply("Unknown hash provided.");
      }

      schedules.splice(index, 1);
      timers[hmatch].clear();
      writeSchedule(schedules);

      if(!parts[0].match(/^LAST/i))
        reply("Removed schedule " + parts[0]);
      else
        reply("Removed last schedule");
    },

  }
};
// alias default for help to default
module.exports.commands["schedule"]["help"]["_default"] 
  = module.exports.commands["schedule"]["_default"];
