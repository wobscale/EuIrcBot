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

  if (!scrollbackModule) {
    this.log.error("No scrollback, can't quo");
    return;
  }

  if (quoModules.length === 0) {
    this.log.warn('no quo modules working, skipping quo');
    return;
  }

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    if (err) {
      reply(err);
      return;
    }
    if (res.match(/(pls|#)noquo/)) {
      reply("don't be a deck, betch");
      return;
    }


    const replyPromises = quoModules.map(el => new Promise(((resolve) => {
      el.post(res, to, (err2, info) => {
        if (err2) {
          resolve(err2);
        } else {
          resolve(info);
        }
      });
    })));

    Promise.all(replyPromises).then(vals => reply(vals.join(' | ')), (err2) => {
      this.log.error('promise rejection should not happen: ', err2);
    });
  });
};
