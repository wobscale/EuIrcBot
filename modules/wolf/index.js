var wolfram = require('wolfram-alpha');
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

module.exports.commands = ['wolf', 'wolfram', 'wolframalpha', 'wa'];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  if(wc === null) {
    return reply("Unable to handle wolfram request; lib not loaded");
  }

  wc.query(remainder, function(err, res) {
    if(err) return reply("Wolfram error: " + err);
    if(!(res && res.length)) return reply("Wolfram error, response is dicked");

    if(res.length === 1) {
      return reply("No result for query: " + res[0].subpods[0].text);
    }

    let r = function(...args) {
      reply.custom({lines: 5, pmExtra: true, replaceNewlines: true}, ...args);
    };

    var primary_pods = res.filter(function(x){return x.primary;});
    if(primary_pods.length === 0) {
      try {
        return r(res[0].subpods[0].text + ': ' + res[1].subpods[0].text);
      } catch(ex) {
        return r("No primary pod, try http://www.wolframalpha.com/input/?i="+encodeURIComponent(remainder));
      }
    }

    var ppod = primary_pods[0];
    try {
      if(ppod.title && ppod.subpods[0].value) {
        return r(ppod.title + ": " + ppod.subpods[0].value);
      } else if(ppod.title && ppod.subpods[0].text ) {
          return r(ppod.title + ": " + ppod.subpods[0].text);
      } else {
        throw("Can't handle this ppod");
      }
    } catch(ex) {
      console.log(JSON.stringify(ppod));
      r("Not sure how to handle primary pod, someone should pull request this");
    }
  });
};
