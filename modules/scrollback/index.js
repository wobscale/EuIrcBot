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

/* Abstract: Quoting lines from IRC is an essential problem with far-reaching
 * impact: many humans and semi-sentient AIs depend on their ability to precisely
 * and concisely specify exactly which embarrasing statements and/or nonsequitirs
 * presented in a real-time group chat system are worthy of being selected for
 * processing by other software, including various quotation recording libraries,
 * machine learning algorithms, and text processing utilities. In this function,
 * the authors present a novel approach to the formatted text selection problem:
 * a deterministic specification of a flexible language for selecting text is
 * defined based on three criteria: speaker name, regular expression match, and
 * sequential number (indices in an inverse relationship with current time); then
 * an algorithm for parsing the language specification and selecting the lines a
 * user's instance of the specification matches is demonstrated.
 */
/* Get lines from scrollback using various range specifications
 *
 * There are three possible range specifiers: nick (N), regex (R), and line number (L).
 * The formal grammar for these specifications:
 *   All = Spec | All Spec | All, Spec
 *   Spec = Nickopt Regexopt Lineopt
 *   Nickopt = e | Nicks
 *   Regexopt = e | Regexes
 *   Lineopt = e | Lines
 *   Nicks = N | Nicks,N
 *   Regexes = R | Regexes,R
 *   Lines = L | L-L | L..L | L...L | Lines,Lines
 *
 * Line parsing is handled by https://github.com/euank/node-parse-numeric-range
 *
 * In general, a range specification after being parsed by numeric-range looks like:
 *   [N1[,N2][,N3]...[,Ni]] [R1[,R2][,R3]...[,Rj]] [L1[,L2][,L3]...[,Lk]][,]
 * This parses to a cross-product of ranges:
 *   [N1,R1,L1], [N1,R1,L2], ..., [N1,R1,Lk],
 *   [N1,R2,L1], [N1,R2,L2], ..., [N1,R2,Lk],
 *   ...
 *   [N1,Rj,L1], ..
 *   (and so on and so forth for N2,...,Ni).
 *
 * If no nick is specified, lines from every nick will be considered;
 * if no regex is specified, every line will match;
 * if no line is specified, the first line matching the range is returned.
 *
 * Multiple range specs may be concatenated together.
 * In cases where ambiguity could occur, a trailing , can be used to indicate
 * where one range ends and the next begins.
 *
 * Examples:
 * joe /dog/ 3
 * -> Return the third line from user joe matching /dog/
 *
 * joe /dog/,/cat/
 * -> Return the first line from user joe matching /dog/,
 *    then the first line from joe matching /cat/
 *
 * joe /dog/ /cat/
 * -> Return the first line from user joe matching /dog/,
 *    then the first line matching /cat/
 *
 * joe,bob 3
 * -> Return the third line from joe, then the third line from bob.
 *
 * joe, /dog/, 3
 * -> Return the first line from joe, then the first line matching /dog/,
 *    then the third line.
 *
 * joe 3 bob /dog/ /cat/ bill, 4
 * -> Return the third line from joe, then the first line from bob
 *    matching /dog/, then the first line matching /cat/, then the
 *    first line from bill, then the fourth line.
 */
module.exports.getFormattedScrollbackLinesFromRanges = function(channel, ranges, cb) {
  var linesToGet = [];
  var parts = ranges;
  if(parts.length === 0 || parts.length === 1 && parts[1] === "") {
    parts = ["1"];
  }

  var i;

  for(i=0;i<parts.length;i++) {
    // TODO, there's some serious duplication going on here
    if(/^(-|\d)/.test(parts[i])) {
      // Starts with a - or number, can't be a nick
      linesToGet.push(rangeParser.parse(parts[i]));
    } else if(/^\/.*\/$/.test(parts[i])) {
      // sandwitched between '/'s, it's a regex
      try {
        var regex = new RegExp(parts[i].substring(1, parts[i].length - 1));
        linesToGet.push(regex);
      } catch(ex) {
        return cb("Could not parse regex: " + parts[i] + ", " + ex.toString());
      }
    } else {
      // This is a nick. If the next one is a number then it's for this nick
      var lineObj = {
        from: parts[i]
      };
      i++;
      if(/^(-|\d)/.test(parts[i])) {
        lineObj.lines = rangeParser.parse(parts[i]);
      } else if(/^\/.*\/$/.test(parts[i])) {
        // sandwitched between '/'s, it's a regex
        try {
          var regex = new RegExp(parts[i].substring(1, parts[i].length - 1));
          lineObj.regex = regex;
        } catch(ex) {
          return cb("Could not parse regex: " + parts[i] + ", " + ex.toString());
        }
      } else {
        lineObj.lines = [1];
        i--;
        // Backtrack, nick not followed by anything it turns out
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
      } else if(obj instanceof RegExp) {
        var matches = revCache.filter(function(el) {
          return obj.test(module.exports.formatLine(el));
        });
        if(matches.length === 0) {
          return cb("Cannot find line matching regex " + obj.toString());
        }
        result.push(matches[0]);
      } else {
        // It's a nick + offset or regex object
        var nick = obj.from;
        var nickCache = revCache.filter(function(el) {
          return el.from == nick;
        });

        if(obj.regex) {
          var matches = nickCache.filter(function(el) {
            return obj.regex.test(module.exports.formatLine(el));
          });
          if(matches.length === 0) {
            return cb("Cannot find line matching regex " + obj.toString());
          }
          result.push(matches[0]);
          continue;
        }

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
