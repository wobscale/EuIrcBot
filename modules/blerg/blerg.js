let config;
let bot;

const blerg = require('blerg');

module.exports.init = function (b) {
  bot = b;
  bot.getConfig('blerg.json', (err, conf) => {
    if (err) return console.log(err);
    config = conf;

    blerg.login(config.username, config.password, (err) => {
      if (err) return console.log(`Trouble logging into blerg account: ${err}`);
    });
  });
};

module.exports.commands = ['quob', 'qub', 'blergit'];

module.exports.run = function (rem, parts, reply, command, from, to, text, raw) {
  if (to[0] != '#') return; // Channels can start with & too? Really? Wow, good thing noone does that


  const scrollbackModule = bot.modules['sirc-scrollback'];

  if (!scrollbackModule) return console.log("No scrollback, can't blerg");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) return reply(err);

    const indented = res.split('\n').map(l =>
      `    ${l}`, // 4 spaces, pre sorta thing
    ).join('\n');

    blerg.put(indented, (err) => {
      if (err) return reply(err);
      bot.sayTo(from, 'Blerged it!');
    });
  });
};

