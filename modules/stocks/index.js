var ss = require('stockscraper');

module.exports.run_stock =  function(r,p,reply) {
  if(p.length === 0) {
    reply('Usage: [<exchange>] <stock>');
    return;
  }

  var exchange, stock;
  if(p.length === 1) {
    exchange = 'NYSE';
    stock = p[0];
  }
  else {
    exchange = p[0];
    stock = p[1];
  }

  ss.stockscraper(exchange, stock, function(err,res) {
    if(err) {
      reply('Error getting stock data');
      return;
    }

    var repl = [
    exchange + ':' + stock, 
    'price', '$' + res.l,
    'change', '$' + res.c, '(%' + res.cp + ')'
      ];

      reply(repl.join(' '));
      });
    }

