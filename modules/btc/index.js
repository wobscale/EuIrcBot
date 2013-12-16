var BTCE = require('btce');
var btce = new BTCE();

function capitalize(str) {
  if(str === '') return '';
  return str[0].toUpperCase() + str.slice(1);
}

function getTickerData(coin, metric, callback) {
  btce.ticker({pair: coin+"_usd"}, function(err, data) {
    if(err || !data || !data.ticker) return callback("Error occured getting BTC prices");
    data = data.ticker;
    if(data[metric.toLowerCase()]) {
      callback(capitalize(metric) + ": $" + data[metric.toLowerCase()]);
    } else {
      callback("Last: $" + data.last + " | Avg: $" + data.avg);
    }
  });
}

module.exports.commands = ['btc', 'ltc'];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  getTickerData(command, remainder, reply);
};
