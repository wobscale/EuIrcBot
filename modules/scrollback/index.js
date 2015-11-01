var _ = require('underscore');
var rangeParser = require('parse-numeric-range');
var async = require('async');
module.exports.command = 'title';

var bot;

var cacheSize = 1000;
var cache = {};

module.exports.init = function(b) {
  bot = b;
};

function logErr(err) {
  if(err) console.log(err);
}

function strl(obj){
  return JSON.stringify(obj) + "\n";
}

function logObject(channel, obj) {
  getCache(channel, function(cache) {
    cache.push(obj);
    while(cache.length > cacheSize) cache.shift();
  });

  bot.appendDataFile(channel + '-complete.log', strl(obj), logErr);
}

function getCache(channel, cb) {
  if(cache[channel]) return cb(cache[channel]);

  // Really should be named '-cache' tbh
  bot.readDataFile(channel + '-complete.log', function(err, res) {
    if(err) return cb([]);
    // in case someone else read it while our diskio was happening; whatev
    if(cache[channel]) return cb(cache[channel]);

    var lines = res.toString().split("\n").filter(function(line){return line.length > 0;}).map(function(line) {
      return JSON.parse(line);
    });

    cache[channel] = lines.slice(-cacheSize);
    return cb(cache[channel]);
  });
}

module.exports.chansay = function(from, chan, text) {
  console.log(text);
  logObject(chan, {
    type: 'msg',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};
module.exports.channotice = function(from, chan, text) {
  logObject(chan, {
    type: 'notice',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};
module.exports.chanaction = function(from, chan, text) {
  logObject(chan, {
    type: 'action',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};

module.exports.chanmsg = function(text, to, from, reply, raw) {
  logObject(to, {
    type: 'msg',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};

module.exports.channotice = function(text, to, from, reply, raw) {
  logObject(to, {
    type: 'notice',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};

module.exports.chanaction = function(text, to, from, reply, raw) {
  logObject(to, {
    type: 'action',
    text: text,
    from: from,
    time: new Date().getTime(),
  });
};


module.exports.formatLine = function(line) {
  if(line.type == 'notice') {
    return '-' + line.from + '- ' + line.text;
  } else if(line.type == 'action') {
    return '* ' + line.from + ' ' + line.text;
  } else {
    return '<' + line.from + '> ' + line.text;
  }
};


module.exports.getFormattedScrollbackLinesFromRanges = function(channel, ranges, cb) {
  var linesToGet = [];
  var parts = ranges;

  var i;

  for(i=0;i<parts.length;i++) {
    if(/^(-|\d)/.test(parts[i])) {
      // Starts with a - or number, can't be a nick
      linesToGet.push(rangeParser.parse(parts[i]));
    } else {
      // This is a nick. If the next one is a number then it's for this nick
      var lineObj = {
        from: parts[i]
      };
      if(/^(-|\d)/.test(parts[i+1])) {
        lineObj.lines = rangeParser.parse(parts[i+1]);
        i++; // We handled it :D
      } else {
        lineObj.lines = [1];
      }
      linesToGet.push(lineObj);
    }
  }

  var result = [];
  getCache(channel, function(cache) {
    var revCache = cache.slice(0);
    revCache.reverse();
    // Remove the first element; it's the command that triggered a request for
    // scrollback for all current callers. TODO, let the caller tell us this
    revCache = revCache.slice(1);

    for(var i=0; i < linesToGet.length; i++) {
      var obj = linesToGet[i];
      if(Array.isArray(obj)) {
        for(var j=0;j < obj.length; j++) {
          var offset = obj[j];
          if(offset > revCache.length || offset === 0) {
            return cb("Cannot get line " + offset + " ago; only have " + revCache.length + " of context");
          }
          result.push(revCache[offset-1]);
        }
      } else {
        // It's a nick
        var nick = obj.from;
        var nickCache = revCache.filter(function(el) {
          return el.from == nick;
        });

        for(var j=0; j < obj.lines.length; j++) {
          var offset = obj.lines[j];
          if(offset > nickCache.length || offset === 0) {
            return cb("Cannot get line " + nick + " " + offset + " ago; only have " + nickCache.length + " of context for " + nick);
          }

          result.push(nickCache[offset-1]);
        }
      }
    }
    cb(null, result.map(function(l) { return module.exports.formatLine(l); }).join("\n"));
  });
};
