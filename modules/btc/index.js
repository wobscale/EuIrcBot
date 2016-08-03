var BTCE = require('btce');
var btce = new BTCE();
var http = require('http');

function capitalize(str) {
  if(str === '') return '';
  return str[0].toUpperCase() + str.slice(1);
}

function getDogecoinData(callback) {
  http.get('http://pubapi.cryptsy.com/api.php?method=singlemarketdata&marketid=132', function(res) {
    var j = '';
    res.on('data', function(c) { j += c; });
    res.on('end', function() {
      try {
        j = JSON.parse(j.toString());
        var dgc_to_btc_last = j.return.markets.DOGE.lasttradeprice;
        var dgc_to_btc_avg = j.return.markets.DOGE.recenttrades.map(function(l) { return parseFloat(l.price); });
        dgc_to_btc_avg = dgc_to_btc_avg.reduce(function(l,r){return l+r;}) / dgc_to_btc_avg.length;
        btce.ticker({pair: "btc_usd"}, function(err, data) {
          if(err || !data || !data.ticker) return callback("Error occured getting BTC prices");
          data = data.ticker;
          callback("Last: $" + data.last * dgc_to_btc_last + " | Avg: $" + data.avg * dgc_to_btc_avg);
        });
      } catch(ex) {
        callback(ex);
        callback("Could not get doge");
      }
    });
  });
}

function getTickerData(coin, metric, callback) {
  if(coin === 'dgc') {
    return getDogecoinData(callback);
  }
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

module.exports.commands = ['btc', 'ltc', 'dgc', 'eth'];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  getTickerData(command, remainder, reply);
};

module.exports.run_cryptoval = function(remainder, parts, reply, command, from, to, text, raw) {
  if(parts.length > 0) {
    var cryptoCurrency = parts.shift();
    getTickerData(cryptoCurrency, parts.join(" "), reply);
  }
};
