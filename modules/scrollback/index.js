const _ = require('underscore');
const rangeParser = require('parse-numeric-range');
const async = require('async');

let bot;
let log;

const cacheSize = 1000;
const cache = {};

module.exports.init = function (b) {
  bot = b;
  log = this.log;
};

function logErr(err) {
  if (err) log.debug(err);
}

function strl(obj) {
  return `${JSON.stringify(obj)}\n`;
}

function logObject(channel, obj) {
  getCache(channel, (cache) => {
    cache.push(obj);
    while (cache.length > cacheSize) cache.shift();
  });

  bot.appendDataFile(`${channel}-complete.log`, strl(obj), logErr);
}

function getCache(channel, cb) {
  if (cache[channel]) return cb(cache[channel]);

  // Really should be named '-cache' tbh
  bot.readDataFile(`${channel}-complete.log`, (err, res) => {
    if (err) return cb([]);
    // in case someone else read it while our diskio was happening; whatev
    if (cache[channel]) return cb(cache[channel]);

    const lines = res.toString().split('\n').filter(line => line.length > 0).map(line => JSON.parse(line));

    cache[channel] = lines.slice(-cacheSize);
    return cb(cache[channel]);
  });
}

module.exports.chansay = function (from, chan, text) {
  logObject(chan, {
    type: 'msg',
    text,
    from,
    time: new Date().getTime(),
  });
};
module.exports.channotice = function (from, chan, text) {
  logObject(chan, {
    type: 'notice',
    text,
    from,
    time: new Date().getTime(),
  });
};
module.exports.chanaction = function (from, chan, text) {
  logObject(chan, {
    type: 'action',
    text,
    from,
    time: new Date().getTime(),
  });
};

module.exports.chanmsg = function (text, to, from, reply, raw) {
  logObject(to, {
    type: 'msg',
    text,
    from,
    time: new Date().getTime(),
  });
};

module.exports.channotice = function (text, to, from, reply, raw) {
  logObject(to, {
    type: 'notice',
    text,
    from,
    time: new Date().getTime(),
  });
};

module.exports.chanaction = function (text, to, from, reply, raw) {
  logObject(to, {
    type: 'action',
    text,
    from,
    time: new Date().getTime(),
  });
};


module.exports.formatLine = function (line) {
  if (line.type == 'notice') {
    return `-${line.from}- ${line.text}`;
  } else if (line.type == 'action') {
    return `* ${line.from} ${line.text}`;
  }
  return `<${line.from}> ${line.text}`;
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
const STATES = Object.freeze({
  NICK: 1,
  REGEX: 2,
  LINES: 3,
  NEW: 4,
  ERROR: 5,
});

module.exports.parseSpecs = function (input) {
  const specs = [];
  let spec = { nicks: [], regexes: [], lines: [] };

  // State machine variables
  let state;

  let i = 0;
  let result = findNextState(input, i, state);
  i = result.index;
  state = result.state;

  if (state === STATES.NEW) { // Can't start in 'new'
    return { error: 'Invalid leading characters' };
  }

  // Parse input into tokens
  while (i < input.length) {
    if (state === STATES.ERROR) {
      return `${{ error: `Could not parse "${input.substring(i)}` }}"`;
    } else if (state === STATES.NICK) {
      result = parseNick(input, i);

      if (i != result.index) { // Got a nick
        i = result.index;
        spec.nicks.push(result.result);
      }
    } else if (state === STATES.REGEX) {
      result = parseRegex(input, i);

      if (result.error !== undefined) {
        return { error: result.error };
      } else if (i != result.index) { // Got a regex
        i = result.index;
        spec.regexes.push(result.result);
      }
    } else if (state === STATES.LINES) {
      result = parseLines(input, i);

      if (result.error !== undefined) {
        return { error: result.error };
      } else if (i != result.index) { // Got some lines
        i = result.index;
        spec.lines = spec.lines.concat(result.result);
      }
    } else if (state === STATES.NEW) {
      specs.push(spec);
      spec = { nicks: [], regexes: [], lines: [] };
    }

    // Get next state
    result = findNextState(input, i, state);
    i = result.index;
    state = result.state;
    if (result.error !== undefined) {
      return { error: result.error };
    }
  }

  specs.push(spec);

  return _.filter(specs, spec => (spec.nicks.length > 0) ||
      (spec.regexes.length > 0) ||
      (spec.lines.length > 0));
};

function parseNick(str, idx) {
  let ret = '';

  while (idx < str.length && !isWhitespace(str[idx]) && str[idx] != ',') {
    ret += str[idx];
    idx++;
  }

  return { result: ret, index: idx };
}

function parseRegex(str, idx) {
  let ret = '';
  let regex;

  idx++; // Eat leading /

  while (idx < str.length && str[idx] != '/') {
    ret += str[idx];
    if (idx < str.length - 1 && str[idx] === '\\') { // Skip over escapes
      idx++;
      ret += str[idx];
    }

    idx++;
  }

  if (idx < str.length) { // Catch the trailing /
    idx++;

    let flags = '';
    if (str[idx] === 'i') { // Check for case-insensitive regex flag
      idx++;
      flags = 'i';
    }

    try { // Parse the regex
      regex = new RegExp(ret, flags);
      return { result: regex, index: idx };
    } catch (ex) {
      return { result: ret, index: idx, error: `Could not parse regex: /${ret}/${flags}, ${ex.toString()}` };
    }
  } else { // Unterminated regex
    return { result: ret, index: idx, error: 'Unterminated regular expression' };
  }
}

function parseLines(str, idx) {
  let ret = '';

  while (idx < str.length && /[0-9\-.,]/.test(str[idx])) {
    ret += str[idx];
    idx++;
  }

  if (str[idx - 1] === ',') { // Put back trailing commas
    idx--;
    ret = ret.slice(0, -1);
  }

  const range = rangeParser.parse(ret);
  if (range === undefined || range.length == 0) {
    return { result: range, index: idx, error: `Could not parse ${ret}` };
  }
  if (_.every(range, num => num > 0)) {
    return { result: range, index: idx };
  }

  return { result: range, index: idx, error: 'Negative line index' };
}

function findNextState(str, idx, state) {
  let isList = false;
  let next = {};

  if (state === STATES.ERROR) {
    return { state, index: idx };
  }

  while (idx < str.length && isWhitespace(str[idx])) { // Consume whitespace
    idx++;
  }

  if (idx < str.length - 1 && str[idx] == ',') {
    if (isWhitespace(str[idx + 1])) { // ", " condition
      idx++;
      return { state: STATES.NEW, index: idx };
    }
    // ",<thing>" condition
    isList = true;
    idx++;
  }

  if (/[a-zA-Z\[\]\\`_\^\{\}\|]/.test(str[idx])) {
    next = { state: STATES.NICK, index: idx };
  } else if (/\//.test(str[idx])) {
    next = { state: STATES.REGEX, index: idx };
  } else if (/[0-9]/.test(str[idx])) {
    next = { state: STATES.LINES, index: idx };
  } else {
    next = { state: STATES.ERROR, index: idx, error: `Could not parse character ${str[idx]}` };
  }

  // Handle "nick nick" or the like
  if (!isList && next.state === state) {
    next.state = STATES.NEW;
  }
  // Enforce ordering of specs
  if (state === STATES.REGEX && next.state === STATES.NICK) {
    next.state = STATES.NEW;
  }
  if (state === STATES.LINES && next.state !== STATES.LINES) {
    next.state = STATES.NEW;
  }

  return next;
}

function isWhitespace(char) {
  return /[ \t]/.test(char);
}

/*  Debugging Command
 *  Shows the sets of nicks, regexes, and lines parsed from one or more specifications.
 *  Usage: !echo joe bob bill /hillbilly/ 4
 */
module.exports.command = 'echo';
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const specs = module.exports.parseSpecs(remainder);

  if (specs.error !== undefined) {
    bot.sayTo(from, specs.error);
    return;
  }

  if (specs.length == 0) {
    bot.sayTo(from, 'Parsed nothing!');
  }
  for (let i = 0; i < specs.length; i++) {
    bot.sayTo(from, `Spec ${i}:`);
    bot.sayTo(from, 'Nicks:');
    for (var j = 0; j < specs[i].nicks.length; j++) {
      bot.sayTo(from, specs[i].nicks[j]);
    }
    bot.sayTo(from, 'Regexes:');
    for (var j = 0; j < specs[i].regexes.length; j++) {
      bot.sayTo(from, specs[i].regexes[j]);
    }
    bot.sayTo(from, 'Lines:');
    for (var j = 0; j < specs[i].lines.length; j++) {
      bot.sayTo(from, specs[i].lines[j]);
    }
    bot.sayTo(from, '===');
  }
};

// Takes in a list of specs produced from parseSpecs() and produces a list of
// raw scrollback content from a channel and the reason why that content was
// included.  The result is a list of dicts containing nick, regex, line, spec, and
// content fields or an error message.
// For example, [{
//                nick:'joe',
//                regex:'/cat/',
//                line:3,
//                spec:{nicks:['joe'], regexes:['/cat/'], lines:[3]},
//                content:{from:'joe', text:'I like cat'}
//              }]
// Should a nick or regex not be specified, that element of the result
// object will not be set (and thus undefined).
// If a line is not specified, it will be set to 1.
module.exports.getScrollbackForSpecs = function (channel, specs, cb) {
  const lines = [];

  if (specs.length === 0) {
    specs = [{ nicks: [], regexes: [], lines: [1] }];
  }

  getCache(channel, (cache) => {
    let revCache = cache.slice(0);
    revCache.reverse();
    // Remove the first element; it's the command that triggered a request for
    // scrollback for all current callers. TODO, let the caller tell us this
    revCache = revCache.slice(1);

    for (let i = 0; i < specs.length; i++) {
      const nickChunks = [];
      let regexChunks = [];

      const spec = specs[i];

      // Filter Nicks
      for (let n = 0; n < spec.nicks.length; n++) {
        var nick = spec.nicks[n];

        var matches = revCache.filter(el => el.from == nick);

        if (matches.length == 0) {
          return cb(`Cannot find line from ${nick}; only have ${revCache.length} lines of context`, null);
        }

        nickChunks.push({ nick, contents: matches });
      }

      if (spec.nicks.length == 0) { // No nicks specified; match from any nick
        nickChunks.push({ contents: revCache });
      }

      // Filter regexes
      for (let r = 0; r < spec.regexes.length; r++) {
        var regex = spec.regexes[r];

        for (var c = 0; c < nickChunks.length; c++) {
          var chunk = nickChunks[c];

          var matches = chunk.contents.filter(el => regex.test(module.exports.formatLine(el)));

          if (matches.length == 0) {
            error = 'Cannot find line';
            if (chunk.nick !== undefined) {
              error += ` from ${chunk.nick}`;
            }
            error += ` matching regex ${regex.toString()}; only have ${revCache.length} lines of context`;
            return cb(error, null);
          }

          regexChunks.push({ nick: chunk.nick, regex, contents: matches });
        }
      }

      if (spec.regexes.length == 0) { // No regexes specified; match any line
        regexChunks = nickChunks;
      }

      // Filter lines
      if (spec.lines.length == 0) { // No line specified; match first line
        spec.lines = [1];
      }

      for (let l = 0; l < spec.lines.length; l++) {
        const offset = spec.lines[l];

        for (var c = 0; c < regexChunks.length; c++) {
          var chunk = regexChunks[c];

          if (offset > chunk.contents.length || offset === 0) {
            error = 'Cannot find line';
            if (chunk.nick !== undefined) {
              error += ` from ${chunk.nick}`;
            }
            if (chunk.regex !== undefined) {
              error += ` matching regex ${chunk.regex.toString()}`;
            }
            error += ` ${offset} ago; only have ${revCache.length} lines of context`;
            return cb(error, null);
          }

          lines.push({
            nick: chunk.nick, regex: chunk.regex, line: offset, spec, content: chunk.contents[offset - 1],
          });
        }
      }
    }

    return cb(null, lines);
  });
};

module.exports.getFormattedScrollbackLinesFromRanges = function (channel, input, cb) {
  const specs = module.exports.parseSpecs(input);

  if (specs.error) {
    log.debug(specs.err);
    return cb(specs.error);
  }

  module.exports.getScrollbackForSpecs(channel, specs, (err, lines) => {
    if (err) {
      return cb(err);
    }

    return cb(null, _.map(lines, l => module.exports.formatLine(l.content)).join('\n'));
  });
};

