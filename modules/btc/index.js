var btc = require('btc');

module.exports.command = "btc";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  btc.price('mtgox', function(err, prices) {
    if(err || prices === undefined || prices.data === undefined) return reply("Error occured getting BTC prices");
    if(prices.data[remainder]) {
      reply(remainder + ":", prices.data[remainder].display);
    } else {
      reply("Last:", prices.data.last.display, "| Avg:", prices.data.avg.display);
    }
  });
};
