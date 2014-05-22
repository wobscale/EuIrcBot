var config;

var watches = {};

module.exports.init = function(bot) {
  bot.getConfig("blerg.json", function(err, conf) {
    if(err) console.log(err);
    config = conf;

    for(var i=0;i<conf.watch.length;i++) {
      var watch = conf.watch[i];
      var ablerg = require('blerg');
      ablerg.login(watch.username, watch.password, function(err) {
        if(err) return console.log("Trouble logging into blerg account: " + err);
        watches[watch.nick] = ablerg;
      });
    }
  });
};


module.exports.msg = function(text, from, reply, raw) {
  if(watches[from.toLowerCase()]) {
    watches[from.toLowerCase()].put(text, function(err) {
      if(err) reply("Error blerging: " + err);
    });
  }
};
