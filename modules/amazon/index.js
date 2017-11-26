const amazon = require('amazon-product-api');

let amazonClient = null;
let log;

module.exports.init = function (bot) {
  log = bot.log;
  bot.getConfig('amazon.json', (err, conf) => {
    if (err) return log.error(`Unable to load amazon module: ${err}`);
    try {
      amazonClient = amazon.createClient(conf);
    } catch (ex) {
      log.error(`Error loading amazon library: ${ex}`);
    }
  });
};

const extractAsin = function (url) {
  let asin;
  const amazonRegex = /(B[0-9]{2}[0-9A-Z]{7}|[0-9]{9}(?:X|[0-9]))/;
  match = amazonRegex.exec(url);
  if (match && match[1]) { asin = match[0]; }
  return asin;
};

const generateErrorMessage = function (error) {
  try {
    const err = error[0].Error[0];
    // AWS.InvalidParameterValue is returned when an prospective ASIN isn't actually a real ASIN, so we squash it
    if (err.Code[0] == 'AWS.InvalidParameterValue') {
      return '';
    }
    return 'Error: ${err.Message[0]}';
  } catch (ex) {}
  return JSON.stringify(error);
};

const generateResponse = function (results) {
  const attributes = results[0].ItemAttributes[0];
  let msg = attributes.Title;
  // Free Prime exclusives and sold out items do not have a price. If this occurs, simply return title
  if (typeof attributes.ListPrice !== 'undefined') {
    const price = attributes.ListPrice[0].FormattedPrice[0];
    msg += `- [${price}]`;
  }
  return msg;
};

module.exports.url = function (url, reply) {
  if (amazonClient === null) return;
  const asin = extractAsin(url);
  if (asin) {
    const query = { itemId: asin };
    amazonClient.itemLookup(query, (err, results) => {
      let msg;
      if (err) {
        msg = generateErrorMessage(err);
      } else {
        msg = generateResponse(results);
      }
      if (msg) return reply(msg);
    });
  }
};

