var wolfram = require('wolfram');
var wc = null;

module.exports.init = function(bot) {
  bot.getConfig("wolfram.json", function(err, conf) {
    if(err) console.log("Unable to load wolfram module: " + err);
    try {
      wc = new wolfram.createClient(conf.appid);
    } catch(ex) {
      bot.say("Error loading wolfram library: " + ex);
    }
  });
};

module.exports.commands = ['wolf', 'wolfram', 'wolframalpha'];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  if(wc === null) {
    return reply("Unable to handle wolfram request; lib not loaded");
  }

  wc.query(remainder, function(err, res) {
    if(err) return reply("Wolfram error: " + err);

      if(res.length === 1) {
        return reply("No result for query: " + out[0].subpods[0].value);
      }

    var primary_pods = res.filter(function(x){return x.primary;});
    if(primary_pods.length === 0) {
      try {
        return reply(res[0].subpods[0].value + ': ' + res[1].subpods[0].value.split('\n').join(' ~ '));
      } catch(ex) {
        return reply("No primary pod, try http://www.wolframalpha.com/input/?i="+encodeURIComponent(remainder));
      }
    }

    var ppod = primary_pods[0];
    try {
      if(ppod.title && ppod.subpods[0].value) {
        reply(ppod.title + ": " + ppod.subpods[0].value);
      } else {
        throw("Can't handle this ppod");
      }
    } catch(ex) {
      console.log(ppod);
      reply("Not sure how to handle primary pod, someone should pull request this");
    }
  });
};
