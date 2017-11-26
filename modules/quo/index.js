let bot = null;
module.exports.init = function (b) {
  bot = b;
};

module.exports.commands = ['quo'];

module.exports.run = function (r, parts, reply, command, from, to) {
  if (!bot.isChannel(to)) {
    return;
  }

  const scrollbackModule = bot.modules['sirc-scrollback'];
  const twit = bot.modules['sirc-twitter'];
  const qdb = bot.modules['sirc-qdb'];

  const quoModules = [];
  if (twit) {
    quoModules.push(twit);
  }
  if (qdb) {
    quoModules.push(qdb);
  }

  if (!scrollbackModule) return console.log("No scrollback, can't quo");

  if (quoModules.length === 0) {
    return console.log('no quo modules working, skipping quo');
  }

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) return reply(err);
    if (res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");


    const replyPromises = quoModules.map(el => new Promise(((resolve, reject) => {
      el.post(res, to, (err, info) => {
        if (err) {
          resolve(err);
        } else {
          resolve(info);
        }
      });
    })));

    Promise.all(replyPromises).then(vals => reply(vals.join(' | ')), (err) => {
      console.log('promise rejection should not happen: ', err);
    });
  });
};
