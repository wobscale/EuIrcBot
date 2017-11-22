const coinmarketcap = require('@linuxmercedes/coinmarketcap');

function findDataForCoin(coin, data) {
  const matches = data.filter(datum => coin.toLowerCase() === datum.symbol.toLowerCase());
  if (matches.length == 0) {
    return `Could not find data for ${coin}`;
  }

  const match = matches[0];

  const price = `Price: $${match.price_usd}`;
  let change = ' | Change over last:';
  let append_change = false;

  if (match.percent_change_1h !== null) {
    change += (` Hour: ${match.percent_change_1h}%`);
    append_change = true;
  }
  if (match.percent_change_24h !== null) {
    change += (` Day: ${match.percent_change_24h}%`);
    append_change = true;
  }
  if (match.percent_change_7d !== null) {
    change += (` Week: ${match.percent_change_7d}%`);
    append_change = true;
  }

  return price + (append_change ? change : '');
}

function getTickerData(coin, callback) {
  coinmarketcap.ticker()
    .then(data => callback(findDataForCoin(coin, data)))
    .catch((reason) => {
      this.log.debug(reason);
      return callback('Error occured getting price');
    });
}

module.exports.commands = ['btc', 'ltc', 'doge', 'eth', 'etc', 'zec'];
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  getTickerData(command, reply);
};

module.exports.run_cryptoval = function (remainder, parts, reply, command, from, to, text, raw) {
  if (parts.length > 0) {
    const cryptoCurrency = parts.shift();
    getTickerData(cryptoCurrency, parts.join(' '), reply);
  }
};
