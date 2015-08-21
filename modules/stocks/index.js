var ss = require('stockscraper');

var bot;
var aliases = {
  exchange: {},
  stock: {}
};

module.exports.init = function(b) {
  bot = b;
  bot.fsGetData('stocks', 'aliases.json', function(err, res) {
    if(err) {
      return;
    }

    aliases = JSON.parse(res);

  });
}

module.exports.run_stock =  function(r,p,reply) {
  if(p.length === 0) {
    reply('Usage: [<exchange>] <stock> | add <exchange|stock> <alias> <data>');
    return;
  }

  if(p[0] === 'add') {
    addAlias(p, reply);
  }
  else {
    getStock(p, reply);
  }
}

function addAlias(p, reply) {
  aliases[p[1]][p[2]] = p[3];
  bot.fsStoreData('stocks', 'aliases.json', JSON.stringify(aliases), function () {
    reply('Added alias ' + p[2] + ' for ' + p[3]);
  });
}

function getStock(p, reply) {
  var exchange, stock;
  if(p.length === 1) {
    exchange = 'NYSE';
    stock = p[0];
  }
  else {
    exchange = p[0];
    stock = p[1];
  }

  exchange = aliases.exchange[exchange] || exchange;
  stock = aliases.stock[stock] || stock;

  ss.stockscraper(exchange, stock, function(err,res) {
    if(err) {
      reply('Error getting stock data');
      return;
    }

    var repl = [
      res.e + ':' + res.t, 
      'price', '$' + res.l,
      'change', '$' + res.c, '(%' + res.cp + ')'
    ];

    reply(repl.join(' '));
  });
}

