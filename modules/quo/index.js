var bot = null;
module.exports.init = function(b) {
  bot = b;
};

module.exports.commands = ['quo'];

module.exports.run = function(r, parts, reply, command, from, to) {
  if (!bot.isChannel(to)) {
    return;
  }

  var scrollbackModule = bot.modules['sirc-scrollback'];
  var twit = bot.modules['sirc-twitter'];
  var qdb = bot.modules['sirc-qdb'];

  var quoModules = [];
  if(twit) {
    quoModules.push(twit);
  }
  if(qdb) {
    quoModules.push(qdb);
  }

  if(!scrollbackModule) return console.log("No scrollback, can't quo");

  if(quoModules.length === 0) {
    return console.log("no quo modules working, skipping quo");
  }

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, function(err, res) {
    if(err) return reply(err);
    if(res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");


    var replyPromises = quoModules.map(function(el) {
      return new Promise(function(resolve, reject) {
        el.post(res, to, function(err, info) {
          if(err) {
            resolve(err);
          } else {
            resolve(info);
          }
        });
      });
    });

    Promise.all(replyPromises).then(function(vals) {
      return reply(vals.join(" | "));
    }, function(err) {
      console.log("promise rejection should not happen: ", err);
    });
  });
};
