/* eslint-disable no-param-reassign */
const later = require('later');
const Moment = require('moment');
const hash = require('json-hash');
require('sugar');
require('moment-duration-format');

let bot;
let log;

let minimumCreationDelay = 0;
let minimumInterval = 60;
let noCommands = false;
let digestLength = 4;

// cache
let lastSchedule;

// digest -> schedule
// TODO: make schedules a proper object w/ .length support
let schedules = {};
// { 'id': <digest of data before adding timer and stuff>,
//   'created': <created timestamp>,
//   'schedule:' <later schedule>,
//   'blame': <owner>,
//   'calls': <number of calls left>,
//   'channel': <channel to print in>,
//   'command': <what to say / execute>,
//   'timer': <our timer instance if any>
// }

// m1 - m2 so pass in backwards for positive
const getDifference = (m1, m2) => (
  Moment.duration(Moment(m1).diff(Moment(m2), 'milliseconds'))
);

const getAverageInterval = (s) => {
  const numSamples = 5;
  let next = later.schedule(s).next(numSamples + 2); // skip NEXT occurrence
  let totalSeconds = 0;

  next = next.map(sched => new Moment(sched));

  for (let i = 1; i <= numSamples; i += 1) {
    totalSeconds += Number.parseInt(getDifference(next[i + 1], next[i]).format('s'), 10);
  }

  return totalSeconds / numSamples;
};

const writeSchedule = (data) => {
  bot.writeDataFile('later.json', JSON.stringify(data), (err) => {
    if (err) {
      log.error(`Error writing command file: ${err}`);
    }
  });
};

const sortSchedules = scheds => (
  Object.values(scheds).sort((a, b) => a.created - b.created)
);

const registerCommand = (data) => {
  const command = () => {
    const s = schedules[data.id];

    if (data.target !== undefined) {
      bot.sayTo(data.channel, `${data.target}: ${data.command}`);
    } else {
      bot.sayTo(data.channel, data.command);
    }

    bot.client.emit(
      'message', bot.client.nick, data.channel,
      data.command, data.command,
    );

    if (s && s.calls !== -1) {
      s.calls -= 1;

      // deactivate and delete command
      if (data.calls === 0) {
        if (s.timer !== null) {
          s.timer.clear();
        }

        delete schedules[data.id];
      }

      // write changes
      writeSchedule(schedules);
    }
  };

  schedules[data.id].timer = later.setInterval(command, data.schedule);
};

const newSchedule = (data) => {
  let s;

  // reminders use cron
  if (data.calls === -1) {
    try {
      s = later.parse.text(data.schedule);
    } catch (ex) {
      return ex;
    }

    if (typeof s === 'number' || s.error >= 0) {
      let offset = 0;

      if (typeof s === 'number') {
        offset = s;
      } else {
        offset = s.error;
      }

      // eslint-disable-next-line prefer-template
      return 'Provided schedule query doesn\'t parse:\n'
             + `    ${data.schedule.slice(0, offset)} \u032D`
             + data.schedule.slice(offset, data.schedule.length);
    }
  } else {
    s = later.parse.cron(data.schedule);
  }

  data.schedule = s;

  // check that command is valid
  //   - check if commands are disabled
  //   - doesn't call schedule
  //   - doesn't call a dumbcommand which calls schedule
  //     * checked via perceived caller
  //   - isn't too close to last call
  // check execution frequency is below some minimum (config)

  if (noCommands
      && data.command.substring(0, bot.config.commandPrefix.length) === bot.config.commandPrefix) {
    return 'Commands are disabled';
  }

  if (/^!schedule/.test(data.command)) {
    return `${data.blame}: fuck you`;
  }

  if (/^\s*$/.test(data.command)) {
    return 'Must specify something for command/message';
  }

  if (data.blame === bot.client.nick) {
    return 'Cannot call schedule recursively.';
  }
  if (!lastSchedule) {
    lastSchedule = schedules && sortSchedules(schedules)[Object.keys(schedules).length - 1];
  }

  if (minimumCreationDelay > 0 && lastSchedule
      && Moment().diff(lastSchedule.created, 'seconds') <= minimumCreationDelay) {
    return `Schedule creation is rate limited. Please wait at least ${minimumCreationDelay}`
           + ' seconds between schedule creation.';
  }

  if (data.calls >= 5 || data.calls === -1) {
    // s.range should be the range, in seconds, between schedule calls...
    // but it's undefined.
    const interval = getAverageInterval(s);
    if (minimumInterval > 0 && interval < minimumInterval) {
      return `Parsed average frequency of ${Moment.duration(interval, 'seconds').format()}`
             + ` is below the minimum interval of ${minimumInterval} seconds`;
    }
  }

  // Handle private message schedules. These show as channel being us--- it should
  // be them.
  if (data.channel === bot.client.nick) {
    data.channel = data.blame;
  }

  // get digest for our data
  const digest = hash.digest(data).substr(0, digestLength);
  data.id = digest;
  data.timer = null;
  schedules[digest] = data;

  registerCommand(data);
  lastSchedule = data;
  writeSchedule(schedules);

  let next = getDifference(later.schedule(s).next(1), Moment()).format();
  if (next === '0') {
    next = getDifference(later.schedule(s).next(2)[1], Moment()).format();
  }

  if (next.match(/^\d+$/)) {
    next = `${next} seconds`;
  }

  return `Created ${digest}, the first execution is in ${next}.`;
};

module.exports.init = function init(b) {
  bot = b;
  log = this.log; // eslint-disable-line prefer-destructuring

  bot.readDataFile('later.json', (err, data) => {
    if (err) {
      log.debug('Initializing later.json');
      schedules = {};
      writeSchedule(schedules);
    } else {
      try {
        schedules = JSON.parse(data);

        // process schedules
        Object.values(schedules).forEach((e) => {
          e.created = new Moment(e.created);
          e.timer = null;
          registerCommand(e);
        });
      } catch (ex) {
        log.error(`Error parsing: ${ex}`);
        log.error('Corrupted later.json for schedule! Resetting file...');
        schedules = {};

        writeSchedule(schedules);
      }
    }
  });

  bot.getConfig('schedule.json', (err, conf) => {
    if (!err) {
      minimumInterval = conf.minimum_interval;
      minimumCreationDelay = conf.minimum_creation_delay;
      noCommands = conf.no_commands;
      digestLength = conf.digest_length;
    }
  });
};

module.exports.commands = {
  remindme: null, // alias for remind with target from
  remind: (r, parts, reply, x, from, to) => {
    if (parts.length < 2) {
      reply('Usage: !remind ([target]) \'timeframe\' \'text\'');
      reply('       Optional target defaults no one (channel wide).');
      return;
    }

    let target;
    let schedule;
    let command;

    if (parts.length === 2) {
      [schedule, command] = parts;
    } else {
      [target, schedule, command] = parts;
    }

    if (/in|at|after|tomorrow|next|from/i.test(schedule)) {
      // use sugar to handle relative dates--- moment/later sucks at this
      const s = Date.create(schedule);

      if (!s.isValid()) {
        reply('Invalid relative date provided.');
        return;
      }

      if (!s.isFuture()) {
        reply('Cannot make reminders for past dates/times.');
        return;
      }

      // massage into a cron format
      schedule = s.utc().format('{m} {H} {d} {M} *');
    }

    reply(newSchedule({
      blame: from,
      created: new Moment(),
      schedule,
      command,
      channel: to,
      calls: 1,
      target,
    }));
  },
  schedule: {
    _default: (x, y, reply) => {
      reply('Usage: !schedule [<add>|<remove>|<list>|<help>] [arguments]');
      reply('       Also see !schedule help <subcommand> for more details');
    },
    help: {
      _default: null, // to be aliased later to ^
      add: (x, y, reply) => {
        reply('Usage: !schedule add \'timeframe\' \'command or text\'');
        reply('       Timeframe syntax is here: http://bunkat.github.io/later/parsers.html#text');
        reply('       If a valid command isn\'t specified, it is treated as text to print.');
      },
      remove: (x, y, reply) => {
        reply('Usage: !schedule remove [digest]');
        reply('       Removes the schedule specified by the digest.');
      },
      list: (x, y, reply) => {
        reply('Usage: !schedule list [offset=0]');
        reply('       Provides a list of schedules, in pages, from the specified offset of 0.');
      },
    },
    add: (r, parts, reply, command, from, to) => {
      if (parts.length !== 2) {
        reply('add must have *exactly* two arguments');
        return;
      }

      reply(newSchedule({
        blame: from,
        created: new Moment(),
        schedule: parts[0],
        command: parts[1],
        channel: to,
        calls: -1,
      }));
    },
    list: (x, parts, reply, command, from) => {
      let offset = 0;
      let count = 5;
      const size = Object.keys(schedules).length;

      if (parts.length >= 1) {
        offset = parseInt(parts[0], 10);
      }

      if (offset < 0) {
        offset = size + offset;
      }

      if (offset >= size) {
        return bot.sayTo(from, `There are only ${size} schedules`);
      }

      if (size === 0) {
        return bot.sayTo(from, 'There are no schedules.');
      }

      if (count + offset > size) {
        count = size - offset;
      }

      const sortedSchedules = sortSchedules(schedules);

      for (let i = offset; i < offset + count; i += 1) {
        const e = sortedSchedules[i];
        let { channel } = e;

        if (!bot.config.channelPrefixes.includes(channel[0])) {
          channel = `@${channel}`;
        }

        bot.sayTo(
          from,
          // eslint-disable-next-line prefer-template
          `${sortedSchedules[i].id}     ${e.blame}     `
          + `${e.created.format('ddd MM/DD/YY HH:mm:ss Z')}     ${channel}`,
        );

        if (e.command[0] === bot.config.commandPrefix) {
          bot.sayTo(from, `     command: ${e.command}`);
        } else {
          bot.sayTo(from, `     say: ${e.command}`);
        }
      }

      return bot.sayTo(
        from,
        `Displayed schedules ${offset + 1}-${offset + count} of ${size}`,
      );
    },
    remove: (r, parts, reply) => {
      if (parts.length !== 1) return reply('remove must have *exactly* one argument');

      const digest = parts[0];

      if (Object.keys(schedules).length === 0) {
        return reply('There are no schedules to delete.');
      }

      if (!(digest in schedules)) {
        return reply(`There is no schedule for ${digest}`);
      }

      const s = schedules[digest];

      if (s.timer != null) {
        s.timer.clear();
      }

      reply(`Removing schedule by "${s.blame}" which runs "${s.command}"`);

      delete schedules[digest];
      return writeSchedule(schedules);
    },
  },
};

// alias default for help to default
// eslint-disable-next-line no-underscore-dangle
module.exports.commands.schedule.help._default = module.exports.commands.schedule._default;

// remindme is just remind with our name in the first part
module.exports.commands.remindme = (r, parts, reply, command, from, to, text, raw) => {
  parts.unshift(from);
  module.exports.commands.remind(r, parts, reply, command, from, to, text, raw);
};
