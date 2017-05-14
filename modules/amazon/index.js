var amazon = require('amazon-product-api');

var a = null;
var aConf = null;
var bot = null;

var amazonRegex = /(?:dp|o|gp|-)\/(B[0-9]{2}[0-9A-Z]{7}|[0-9]{9}(?:X|[0-9]))/;

module.exports.init = function(b) {
  bot = b;
  bot.getConfig("amazon.json", function(err, conf) {
    aConf = conf;
    if(err) bot.say("Unable to load amazon module: " + err);
    try {
      a = new amazon.createClient(conf);
    } catch(ex) {
      bot.say("Error loading amazon library: " + ex);
    }
  });
};

module.exports.commands = [];

module.exports.url = function(url, reply) {
  if(a === null) return reply("Unable to handle amazon url; lib not loaded");

  var m;
  if((m = twitRegex.exec(url))) {
    if(m[1]) {
      a.itemLookup({item_id: m[1]}, function(err, results) {
        if(err) reply("Error getting item " + m[1]);
        else reply(results.Item); // not sure exactly what the results are supposed to look like
      });
    }
  }
};

