var BTCE = require('btce');
var btce = new BTCE();

module.exports.command = "btc";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  btce.ticker({pair: "btc_usd"}, function(err, data) {
    if(err || !data || !data.ticker) return reply("Error occured getting BTC prices");
    data = data.ticker;
    if(data[remainder.toLowerCase()]) {
      reply(remainder + ":", data[remainder.toLowerCase()]);
    } else {
      reply("Last:", data.last, "| Avg:", data.avg);
    }
  });
};
