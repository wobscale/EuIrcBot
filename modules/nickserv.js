let config = null;
let bot = null;
let log = null;

// Only respond to a nickserv notice once.
let identified = false;

module.exports.init = function (b) {
  bot = b;
  log = this.log;

  bot.getConfig('nickserv.json', (err, conf) => {
    if (err) {
      log.error(err);
      return;
    }

    config = conf;

    bot.sayTo(config.nickserv || 'nickserv', 'identify', bot.client.nick, config.password);
  });
};

module.exports.pmnotice = (text, from) => {
  const nickServText = config.nickservsuccess || '^You are now identified for ';

  if (!identified && from.toLowerCase() === (config.nickserv || 'nickserv')
      && new RegExp(nickServText, 'i').test(text)) {
    bot.joinChannels();
    identified = true;
    log.info('Identified with nickserv, rejoining channels.');
  }
};

module.exports.run_register = (r, parts, reply) => {
  if (config === null) {
    reply('Please configure a password');
    return;
  }

  if (parts.length < 1) {
    reply('Usage: !register <email address>');
    return;
  }

  bot.sayTo(config.nickserv || 'nickserv', 'register', config.password, parts[0]);
  reply('Registered!');
};
