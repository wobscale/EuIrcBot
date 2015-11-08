var later  = require('later');
var moment = require('moment');

require("moment-duration-format");

var bot;

var minimumCreationDelay = 0; 
var minimumInterval = 60; 
var noCommands = false;

//FIXME: this is gross vv
var schedules = [];
var timers = [];

// m1 - m2 so pass in backwards for positive
function getDifference(m1,m2) {
  return moment.duration(moment(m1).diff(moment(m2), "milliseconds"));
}

function getAverageInterval(s) {
  var numSamples = 5;
  var next = later.schedule(s).next(numSamples+2); // skip NEXT occurrence
  var totalSeconds = 0;

  next.forEach(function(e,i,d) {
    e = moment(e);
  });
  
  for(i=1; i<=numSamples; i++)
  {
    totalSeconds += parseInt(getDifference(next[i+1], next[i]).format("s"));
  }

  return totalSeconds/numSamples;
}

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

  if(typeof(s) == "number" || s.error >= 0 )
  {
    var m = "Provided schedule query doesn't parse:\n";
    var offset = 0;

    if( typeof(s) == "number")
      offset = s;
    else
      offset = s.error;
    
    m += "    " + data['schedule'].slice(0,offset) + '\u032D' 
         + data['schedule'].slice(offset,data['schedule'].length);
    return m;
  }
  
  data['schedule'] = s;

  // check that command is valid
  //   - check if commands are disabled
  //   - doesn't call schedule
  //   - doesn't call a dumbcommand which calls schedule
  //     * checked via perceived caller
  //   - isn't too close to last call
  // check execution frequency is below some minimum (config)
  
  if(noCommands && data.command.substring(0, bot.config.commandPrefix.length) 
      == bot.config.commandPrefix) 
    return "Commands are disabled";

  if(data['command'].match(/^!schedule/))
    return data['blame'] + ": fuck you"; 
  
  if(data['blame'] == bot.client.nick)
    return "Cannot call schedule recursively.";
  
  if(minimumCreationDelay > 0 && schedules.length > 0 
      && moment().diff(schedules.slice(-1)[0].created, 'seconds') <= minimumCreationDelay)
    return "Schedule creation is rate limited. Please wait at least " + minimumCreationDelay
           + " seconds between schedule creation.";

  //s.range should be the range, in seconds, between schedule calls...
  //but it's undefined.
  var interval = getAverageInterval(s);
  if(minimumInterval > 0 && interval < minimumInterval)
    return "Parsed average frequency of " + moment.duration(interval, "seconds").format() + " is below the minimum "
           + "interval of " + minimumInterval + " seconds";

  registerCommand(data);

  schedules.push(data);
  writeSchedule(schedules);
  
  var next = getDifference(later.schedule(s).next(1), moment()).format();
  if(next.match(/^\d+$/))
    next = next + " seconds";

  if(next == "0") //FIXME: this usually isn't true. It may say now, but it never makes it.
    return "Created, first execution is now.";
  else
    return "Created, the first execution is in " + next + ".";
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

  timers.push(later.setInterval(command, data['schedule']));
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
      minimumInterval      = conf.minimum_interval;
      minimumCreationDelay = conf.minimum_creation_delay;
      noCommands           = conf.no_commands;
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
        reply("Usage: !schedule remove [index|LAST]");
        reply("       Removes the schedule specified by the index or the LAST one added.");
      },
      list: function(x,y,reply) {
        reply("Usage: !schedule list [offset=0]");
        reply("       Provides a list of schedules, in pages, from the specified offset of 0.");
      },
    },
    add: function(r, parts, reply, command, from, to, text, raw) {
      if(parts.length !== 2) return reply("add must have *exactly* two arguments");

      //FIXME: handle add on private message
      // check and add schedule
      reply(newSchedule({
        'blame': from,
        'created': new moment(),
        'schedule': parts[0],
        'command': parts[1],
        'channel': to
      }));
    },
    list: function(x, parts, reply, command, from, to) {
      var offset = 0;
      var count  = 5;
      var ci     = count;

      if(parts.length >= 1)
        oi = offset = parseInt(parts[0]);

      if(count+offset > schedules.length)
        count = schedules.length-offset;

      for(i=offset; i<offset+count; i++)
      {
        var e = schedules[i];

        bot.sayTo(from, (i+1) + "     " + e.blame + "     " 
                + e.created.format("ddd MM/DD/YY HH:mm:ss Z")
                + "     " + e.channel);

        var message =  "     ";
        if( e.command.match(/^!/) )
          message += "command: " + e.command;
        else
          message += "say: " + e.command;
        bot.sayTo(from, message);
      }

      var message = "Displayed schedules " + (offset+1) + "-";

      message += (offset+count) + " of " + schedules.length;
      bot.sayTo(from, message);
    },

    remove: function(r, parts, reply) {
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");
      
      var index = parseInt(parts[0]) - 1;

      if(schedules.length == 0)
        return reply("There are no schedules to delete.");

      if(parts[0].match(/^LAST$/i))
        index  = schedules.length-1;

      if(index >= schedules.length || index < 0)
        return reply("Invalid schedule index provided.");

      timers[index].clear();

      schedules.splice(index, 1);
      timers.splice(index, 1);
      writeSchedule(schedules);

      if(!parts[0].match(/^LAST/i))
        reply("Removed schedule at index " + (parseInt(index) + 1));
      else
        reply("Removed last schedule");
    },

  }
};
// alias default for help to default
module.exports.commands["schedule"]["help"]["_default"] 
  = module.exports.commands["schedule"]["_default"];
