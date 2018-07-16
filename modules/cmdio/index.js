const request = require('request');

const apiUrl = 'https://alpha.cmd.io/run/';
let token;
let log;

module.exports.name = 'cmdio';

module.exports.init = function (bot) {
  log = this.log;
  bot.getConfig('cmdio.json', (err, conf) => {
    if (err) {
      log.error(err);
      return;
    }

    token = conf.accessToken;
  });
};

module.exports.commands = [
  'cmdio', 'eval', 'jseval', 'exec', 'rbeval',
  'date', 'ddate', 'python',
];

const cmdEnvMap = {
  jseval: 'wobscale-bot/node',
  eval: 'wobscale-bot/node',
  rbeval: 'wobscale-bot/ruby',
  python: 'wobscale-bot/python',
  ddate: 'wobscale-bot/bash',
  date: 'wobscale-bot/bash',
  exec: 'wobscale-bot/bash',
};

const selfCommands = ['ddate', 'date'];

module.exports.run = function (r, parts, reply, cmd, from, to) {
  if (!token) return;

  let cmdEnv = cmdEnvMap[cmd];
  let data = r;
  if (cmd == 'cmdio') {
    if (parts.length === 0) {
      return reply('must provide the cmd name for cmdio');
    }
    cmdEnv = parts[0];
    data = parts.splice(1);
  }
  if (cmdEnv === undefined) {
    log.warning('falling back to bash env: %s %s', cmd, r);
    cmdEnv = 'wobscale-bot/bash';
  }
  if (selfCommands.includes(cmd)) {
    // e.g. `!ddate` executes ddate
    data = `${cmd} ${data}`;
  }

  let response = '';
  let aborted = false;
  let req = request.post({
    url: apiUrl + cmdEnv,
    auth: { username: token, password: '' },
    encoding: 'utf8',
    body: data,
  })
  .on('error', (err) => {
    log.error(err);
    reply('error: ', err);
    return;
  })
  .on('data', (chunk) => {
    if (response.length + chunk.length > (10 * 1024)) {
      reply('over 10kb output; aborted');
      req.abort();
      aborted = true;
      return;
    }
    response += chunk;
  })
  .on('end', () => {
    if (aborted) {
      return;
    }
    if (response.length > 0) {
      reply.custom({ lines: 5, replaceNewlines: true, pmExtra: true }, response);
    } else {
      reply('no output but it ran I guess');
    }
  });
};
