const { URL } = require('url');
const xray = require('x-ray')();

const amazonHostWhitelist = [].concat(...[
  'amazon.com',
  'amazon.de',
  'amazon.co.uk',
  'amazon.co.jp',
  'amazon.cn',
  'amzn.eu',
  'amzn.asia',
  'amzn.to',
  'a.co',
].map(hostname => [hostname, `www.${hostname}`]));
const productQuery = {
  productName: '#productTitle',
};
const priceQuery = {
  ourPrice: '#priceblock_ourprice',
  dealPrice: '#priceblock_dealprice',
  salePrice: '#priceblock_saleprice',
  offerPrice: '.offer-price',
};

function isAmazonUrl(url) {
  return amazonHostWhitelist.includes(url.hostname);
}

module.exports.url = function handleAmazUrl(url, reply) {
  const parsedUrl = new URL(url);
  if (isAmazonUrl(parsedUrl)) {
    const query = Object.assign({}, productQuery, priceQuery);
    xray(url, query)((err, data) => {
      if (err) {
        reply(err);
        return;
      }
      if (typeof data.productName === 'undefined') {
        reply('Error: Failed to find product name');
        return;
      }

      const productName = data.productName.replace('\n', ' ').trim();
      const price = Object.keys(priceQuery)
        .map(selector => data[selector])
        .filter(val => val)[0];
      const displayPrice = price || '$??';
      reply(`${productName} - [${displayPrice}]`);
    });
  }
};

