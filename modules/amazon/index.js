const XRay = require('x-ray');
const xray = XRay();

const amazonUrlWhitelist = [
  "amazon.com",
  "amazon.de",
  "amazon.co.uk",
  "amazon.co.jp",
  "amazon.cn",
  "amzn.eu",
  "amzn.asia",
  "amzn.to",
  "a.co/",
];
const productQuery = {
  productName: "#productTitle"
}
const priceQuery = {
  ourPrice: '#priceblock_ourprice',
  dealPrice: '#priceblock_dealprice',
  salePrice: '#priceblock_saleprice',
  offerPrice: '.offer-price',
};

const isAmazonUrl = function(url) {
  for (let amazUrl in amazonUrlWhitelist) {
    if (url.includes(amazUrl)) return true;
  }
  return false;
};

module.exports.url = function(url, reply) {
  if (isAmazonUrl(url)) {
    const query = Object.assign({}, productQuery, priceQuery);
    xray(url, query)(function(err, data) {
      if (err) {
        reply(err);
        return;
      }
      if (typeof data.productName === "undefined") {
        reply("Error: Failed to find product name");
        return;
      }

      let productName = data.productName.replace('\n', ' ').trim();
      let price = Object.keys(priceQuery).map(selector => data[selector]).filter(price => price !== undefined)[0]
      let displayPrice;
      if (price !== undefined) {
        displayPrice = price;
      } else {
        displayPrice = "$??";
      }
      reply(`${productName} - [${displayPrice}]`);
    });
  }
};

