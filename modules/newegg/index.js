var newegg = require('node-newegg-api');

var neweggRegex =  /newegg.com\/Product\/Product.aspx\?.*Item=(N[0-9A-Z]{14})/;

module.exports.url = function(url, reply) {
  var m;
  if((m = neweggRegex.exec(url))) {

    var id = m[1];
    newegg.getProduct(id, function(err, data) {
      if(err) return console.log(err);

      reply(data.Title); //TODO, get price in there somehow.
    });


  }
};
