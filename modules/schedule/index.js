var later  = require('later');
var moment = require('moment');
var sugar  = require('sugar');
var hash = require('json-hash'); 

require("moment-duration-format");

var bot;

var minimumCreationDelay = 0; 
var minimumInterval = 60; 
var noCommands = false;
var digestLength = 8;

// digest -> schedule
var schedules = {};
var lastSchedule = null;
// { 'id': <digest of data before adding timer and stuff>,
//   'created': <created timestamp>,
//   'schedule:' <later schedule>,
//   'blame': <owner>,
//   'calls': <number of calls left>,
//   'channel': <channel to print in>,
//   'command': <what to say / execute>,
//   'timer': <our timer instance if any>
//

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
      JSON.stringify(schedules), function(err) {
        if(err) console.log("Error writing command file: " + err);
  });
}

function newSchedule(data) {
  var s;

  // reminders use cron
  if(data.calls == -1)
  {
    try {
      s = later.parse.text(data.schedule);
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
      
      m += "    " + data.schedule.slice(0,offset) + '\u032D' 
           + data.schedule.slice(offset,data.schedule.length);
      return m;
    }
    
    data.schedule = s;
  }
  else
    s = data.schedule = later.parse.cron(data.schedule);


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

  if(data.command.match(/^!schedule/))
    return data.blame + ": fuck you"; 
  
  if(data.blame == bot.client.nick)
    return "Cannot call schedule recursively.";
  
  if(minimumCreationDelay > 0 && schedules.length > 0 && lastSchedule != 0
      && moment().diff(schedules[lastSchedule].created, 'seconds') <= minimumCreationDelay)
    return "Schedule creation is rate limited. Please wait at least " + minimumCreationDelay
           + " seconds between schedule creation.";

  if(data.calls >= 5 || data.calls == -1)
  {
    //s.range should be the range, in seconds, between schedule calls...
    //but it's undefined.
    var interval = getAverageInterval(s);
    if(minimumInterval > 0 && interval < minimumInterval)
      return "Parsed average frequency of " + moment.duration(interval, "seconds").format() + " is below the minimum "
             + "interval of " + minimumInterval + " seconds";
  }

  // Handle private message schedules. These show as channel being us--- it should
  // be them.
  if(data.channel == bot.client.nick)
    data.channel = data.blame;

  // get digest for our data
  var digest = hash.digest(data).substr(0,digestLength);
  data.id = digest;
  data.timer = null;
  schedules[digest] = data;

  lasSchedule = digest;

  registerCommand(data);
  writeSchedule(schedules);
  
  var next = getDifference(later.schedule(s).next(1), moment()).format();
  if(next == "0")
    next = getDifference(later.schedule(s).next(2)[1], moment()).format();

  if(next.match(/^\d+$/))
    next = next + " seconds";

  return "Created " + digest + ", the first execution is in " + next + ".";
}

function registerCommand(data) {
  var command;

  command = function() {
    var s = schedules[data.id];

    // deactivate and delete command
    if(data.calls == 0)
    {
      if(s.timer != null)
        s.timer.clear();
       
      delete schedules[data.id];
      writeSchedule(schedules);
      return; // command expired
    }

    if(data.target != undefined)
      bot.sayTo(data.channel, data.target + ': ' + data.command);
    else
      bot.sayTo(data.channel, data.command);
    bot.client.emit('message', bot.client.nick, data.channel,
      data.command, data.command);

    if(s.calls != -1)
    {
      s.calls -= 1;

      // write changes
      writeSchedule(schedules);
    }
  };

  schedules[data.id].timer = later.setInterval(command, data.schedule);
}

module.exports.init = function(b) {
  bot = b;
  bot.readDataFile("later.json", function(err, data) {
    console.log("Read data file w/ error '" + err + "'");
    if(err) {
      console.log("Initializing later.json");
      schedules = {};
      writeSchedule(schedules);
    } else {
      try {
        console.log("Parsing later.json...");
        schedules = JSON.parse(data);

        // process schedules
        Object.keys(schedules).forEach(function(i) {
          var e = schedules[i];

          e.created = moment(e.created);
          e.timer = null;
          registerCommand(e);
        });
      } catch(ex) {
        console.log("Error parsing: " + ex);
        console.log("Corrupted later.json for schedule! Resetting file...");
        schedules = {};
        writeSchedule(schedules);
      }
    }
  });

  bot.getConfig("schedule.json", function(err, conf) {
    if(!err) {
      minimumInterval      = conf.minimum_interval;
      minimumCreationDelay = conf.minimum_creation_delay;
      noCommands           = conf.no_commands;
      digestLength         = conf.digest_length;
    }
  });
};

module.exports.commands = {
  remindme: null, // alias for remind with target from
  remind: function(r, parts, reply, command, from, to, text, raw) {
            if(parts.length < 2)
            {
              reply("Usage: !remind ([target]) \"timeframe\" \"text\"");
              reply("       Optional target defaults no one (channel wide).");
              return;
            }
            
            var target, schedule, command;

            if(parts.length == 2)
            {
              schedule = parts[0];
              command  = parts[1];
            }
            else
            {
              target   = parts[0];
              schedule = parts[1];
              command  = parts[2];
            }

            if(schedule.match(/in|at|after|tomorrow|next|from/i))
            {
              // use sugar to handle relative dates--- moment/later sucks at this
              var s = Date.create(schedule);
              if(!s.isValid())
                return reply("Invalid relative date provided.");
              if(!s.isFuture())
                return reply("Cannot make reminders for past dates/times.");

              // massage into a cron format
              schedule = s.utc().format('{m} {H} {d} {M} *');
            }

            reply(newSchedule({
              'blame': from,
              'created': new moment(),
              'schedule': schedule,
              'command': command,
              'channel': to,
              'calls': 1,
              'target': target
            }));
          },
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
        reply("Usage: !schedule remove [digest]");
        reply("       Removes the schedule specified by the digest.");
      },
      list: function(x,y,reply) {
        reply("Usage: !schedule list [offset=0]");
        reply("       Provides a list of schedules, in pages, from the specified offset of 0.");
      },
    },
    add: function(r, parts, reply, command, from, to, text, raw) {
      if(parts.length !== 2) return reply("add must have *exactly* two arguments");

      reply(newSchedule({
        'blame': from,
        'created': new moment(),
        'schedule': parts[0],
        'command': parts[1],
        'channel': to,
        'calls': -1
      }));
    },
    list: function(x, parts, reply, command, from, to) {
      var offset = 0;
      var count  = 5;
      var ci     = count;
      var oi     = 0;
      var size = Object.keys(schedules).length;

      if(parts.length >= 1)
        oi = offset = parseInt(parts[0]);

      if(offset < 0)
        oi = offset = size + offset;

      if(offset >= size)
        return bot.sayTo(from, "There are only " + size + " schedules");
      
      if(size == 0)
        return bot.sayTo(from, "There are no schedules.");

      if(count+offset > size)
        count = size-offset;

      // count and pick
      Object.keys(schedules).forEach(function(digest) {
        if(oi > 0)
        {
          oi -= 1;
          return;
        }

        if(ci == 0)
          return;

        var e = schedules[digest];
        var channel = e.channel;

        if(!channel.match(/^(#|&)/))
          channel = "@"+channel;

        bot.sayTo(from, digest + "     " + e.blame + "     " 
                + e.created.format("ddd MM/DD/YY HH:mm:ss Z")
                + "     " + channel);

        var message =  "     ";
        if( e.command.match(/^!/) )
          message += "command: " + e.command;
        else
          message += "say: " + e.command;
        bot.sayTo(from, message);

        if(ci > 0)
          ci -= 1;
      });

      var message = "Displayed schedules " + (offset+1) + "-";
      message += (offset+count) + " of " + size;

      bot.sayTo(from, message);
    },

    remove: function(r, parts, reply) {
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");
      
      var digest = parts[0];

      if(schedules.length == 0)
        return reply("There are no schedules to delete.");

      if(schedules[digest] == undefined)
        return reply("There is no schedule for " + digest);

      var s = schedules[digest];

      if(s.timer != null)
        s.timer.clear();

      reply("Removed schedule by \"" + s.blame + "\" which runs \"" + s.command + "\"" );

      delete schedules[digest];
      writeSchedule(schedules);
    },

  }
};
// alias default for help to default
module.exports.commands.schedule.help._default 
  = module.exports.commands.schedule._default;

// remindme is just remind with our name in the first part
module.exports.commands.remindme
  = function(r, parts, reply, command, from, to, text, raw) {
    parts.unshift(from);
    module.exports.commands.remind(r, parts, reply, command, from, to, text, raw);
  };
