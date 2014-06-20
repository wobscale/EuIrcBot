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
  if(!cache[channel]) cache[channel] = [];
  cache[channel].push(obj);

  while(cache[channel].length > cacheSize) cache[channel].shift();

  bot.appendDataFile(channel + '-complete.log', strl(obj), logErr);
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


module.exports.getChannelScrollback = function(channel, cb) {
  bot.readDataFile(channel + '-complete.log', function(err, res) {
    if(err) return cb(err);
    //I love nodejs. Do async operation to read file, then sync json.parsing
    //the whole darn thing. And this is gonna get big too. Really big. mistakes
    //were made.
    var lines = res.toString().split("\n").reverse().filter(function(line){return line.length > 0;}).map(function(line) {
      return JSON.parse(line);
    });
    cb(null, lines);
  });
};

module.exports.getChannelScrollbackLines = function(channel, numLines, cb) {
  if(cache[channel] && cache[channel].length > numLines) {
    cb(null, cache[channel].slice().reverse().slice(0, numLines));
  } else {
    module.exports.getChannelScrollback(channel, function(err, res) {
      if(err) return cb(err);
      else cb(null, res.slice(0, numLines));
    });
  }
};
module.exports.getChannelScrollbackLinesm1 = function(channel, numLines, cb) {
  if(cache[channel] && cache[channel].length > numLines) {
    cb(null, cache[channel].slice().reverse().slice(1, numLines));
  } else {
    module.exports.getChannelScrollback(channel, function(err, res) {
      if(err) return cb(err);
      else cb(null, res.slice(1, numLines));
    });
  }

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

module.exports.getFormattedScrollbackLines = function(channel, lineNums, cb) {
  var numNeeded = _.max(lineNums) + 1; //Better safe than sorry with off by one even though I'm darn sure that's not needed

  module.exports.getChannelScrollbackLines(channel, numNeeded, function(err, lines) {
    if(err) return cb(err);

    var out = lineNums.map(function(num) {
      return lines[num-1];
    }).map(function(line) {
      return module.exports.formatLine(line);
    });
    cb(null, out.join('\n'));
  });
};

module.exports.getFormattedScrollbackLines = function(channel, lineNums, cb) {
  var numNeeded = _.max(lineNums) + 1;

  module.exports.getChannelScrollbackLinesm1(channel, numNeeded, function(err, lines) {
    if(err) return cb(err);

    var out = lineNums.map(function(num) {
      return lines[num-1];
    }).map(function(line) {
      return module.exports.formatLine(line);
    });
    cb(null, out.join('\n'));
  });
};

module.exports.getFormattedScrollbackLinesByNick = function(channel, nick, lineNums, cb) {
  // Now here's a tricky problem; we don't know how many lines we actually need to get that many lines for a nick.
  // We arbitrarily scale it by 2 until we get enough
  var maxNum = _.max(lineNums);
  console.log("MaxNum: " + maxNum);
  var numToGet = maxNum * 2;
  var linesByNick;

  var scrollbackLinesGot = 0;

  async.doUntil(function(innerCb) {
    module.exports.getChannelScrollbackLines(channel, numToGet, function(err, lines) {
      if(err) return innerCb(err);
      console.log(nick);

      if(scrollbackLinesGot == lines.length) return innerCb("Ran out of lines without finding enough");
      scrollbackLinesGot = lines.length;

      linesByNick = lines.filter(function(line) {
        return line.from == nick;
      });

      return innerCb(null);
    });
  }, function() {
    if(linesByNick.length >= maxNum) return true;
    numToGet *= 2;
    return false;
  }, function(err) {
    if(err) return cb(err);

    var out = lineNums.map(function(num) {
      return module.exports.formatLine(linesByNick[num-1]);
    });
    return cb(null, out.join('\n'));
  });
};

module.exports.getFormattedScrollbackLinesByNickm1 = function(channel, nick, lineNums, cb) {
  // Now here's a tricky problem; we don't know how many lines we actually need to get that many lines for a nick.
  // We arbitrarily scale it by 2 until we get enough
  var maxNum = _.max(lineNums);
  console.log("MaxNum: " + maxNum);
  var numToGet = maxNum * 2;
  var linesByNick;

  var scrollbackLinesGot = 0;

  async.doUntil(function(innerCb) {
    module.exports.getChannelScrollbackLinesm1(channel, numToGet, function(err, lines) {
      if(err) return innerCb(err);
      console.log(nick);

      if(scrollbackLinesGot == lines.length) return innerCb("Ran out of lines without finding enough");
      scrollbackLinesGot = lines.length;

      linesByNick = lines.filter(function(line) {
        return line.from == nick;
      });

      return innerCb(null);
    });
  }, function() {
    if(linesByNick.length >= maxNum) return true;
    numToGet *= 2;
    return false;
  }, function(err) {
    if(err) return cb(err);

    var out = lineNums.map(function(num) {
      return module.exports.formatLine(linesByNick[num-1]);
    });
    return cb(null, out.join('\n'));
  });
};

// obj = array of format [[1, 2], {from: nick, lines: [1,2]}] meaning 1 line ago, 2 lines ago, and the last thing nick said
module.exports.getFormattedScrollbackLinesByObj = function(channel, obj, cb) {
  async.map(obj, function(item, mcb) {
    if(Array.isArray(item)) {
      module.exports.getFormattedScrollbackLines(channel, item, mcb);
    } else {
      module.exports.getFormattedScrollbackLinesByNick(channel, item.from, item.lines, mcb);
    }
  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.join('\n'));
  });
};
module.exports.getFormattedScrollbackLinesByObjMinusOne = function(channel, obj, cb) {
  async.map(obj, function(item, mcb) {
    if(Array.isArray(item)) {
      module.exports.getFormattedScrollbackLinesm1(channel, item, mcb);
    } else {
      module.exports.getFormattedScrollbackLinesByNickm1(channel, item.from, item.lines, mcb);
    }
  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.join('\n'));
  });
};


module.exports.getFormattedScrollbackLinesFromRanges = function(channel, ranges, cb) {
  var linesToGet = [];
  var parts = ranges;

  for(var i=0;i<parts.length;i++) {
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

  var output = '';

  module.exports.getFormattedScrollbackLinesByObjMinusOne(channel, linesToGet, cb);
};
