var later = require('later');
var hash = require('json-hash');

var bot;

var schedules = [];
var timers = {};

function writeSchedule(data) {
  bot.writeDataFile("later.json", 
      JSON.stringify({'data': data}), function(err) {
        if(err) console.log("Error writing command file: " + err);
  });
}

function newSchedule(data) {
  //keys: 'schedule', 'created', 'from', 'command'
  
  // check that this is a valid schedule
  var s;

  try {
    s = later.parse.text(data['schedule']);
  } catch (ex) {
    return ex;
  }

  if( s == 0 )
    return "Provided schedule query doesn't parse.";
  
  data['schedule'] = s;

  // check frequency is below some minimum
  
  // check valid command
  data['iscommand'] = bot.commandExists(data['command']);

  registerCommand(data);

  schedules.push(data);
  writeSchedule(schedules);
}

function registerCommand(data) {
  var command;

  //If it's a command, emulate being sent a command. Otherwise say it.
  if( data['iscommand'] )
  {
    command = function() {
      //FIXME: Properly implement raw.
      bot.client.emit('message', data['blame'], data['channel'], 
        data['command'], data['command']);
    };
  }
  else
  {
    command = function() {
      bot.sayTo(data['channel'], data['command']);
    };
  }

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
          e['created'] = new Date(Date.parse(e['created']));
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

};

//  bot.getConfig("dumbcommand.json", function(err, conf) {
//    if(!err) {
//      allowCmds = conf['allow_commands'];
//    }
//  });


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
        'created': new Date(),
        'schedule': parts[0],
        'command': parts[1],
        'channel': to
      });

      if( err )
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
        if( oi != 0 )
          oi -= 1;
        else if( ci > 0 )
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
      if( count+offset > schedules.length )
      {
        count = schedules.length-offset;
      }

      message += (offset+count) + " of " + schedules.length;
      bot.sayTo(from, message);
    },

    remove: function(r, parts, reply) {
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");
      //FIXME: Do a hash lookup here instead of a linear search
      //FIXME: add LAST
      
      var index = null;
      var hmatch = null;

      schedules.forEach(function(e,i,d) {
        var h = hash.digest(e);
        if(h.substr(0,8) == parts[0])
        {
          index = i;
          hmatch = h;
        }
      });

      if( index == null )
        return reply("Unknown hash provided.");

      delete schedules[index];
      timers[hmatch].clear();
      writeSchedule(schedules);

      reply("Removed schedule " + parts[0]);
    },

  }
};
// alias default for help to default
module.exports.commands["schedule"]["help"]["_default"] 
  = module.exports.commands["schedule"]["_default"];
