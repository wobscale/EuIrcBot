const newegg = require('node-newegg-api');

const neweggRegex = /newegg.com\/Product\/Product.aspx\?.*Item=(N[0-9A-Z]{14})/;

module.exports.url = function (url, reply) {
  let m;
  if ((m = neweggRegex.exec(url))) {
    const id = m[1];
    newegg.getProduct(id, (err, data) => {
      if (err) return console.log(err);

      reply(data.Title); // TODO, get price in there somehow.
    });
  }
};
