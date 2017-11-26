const dns = require('dns');
const URI = require('uri-js');
const async = require('async');

module.exports.name = 'sirc-dns';

function runDnsFn(fn, urls, reply) {
  async.map(urls, (url, cb) => {
    fn(url, (err, domains) => {
      if (err || domains.length === 0) cb(null, [url, 'No dns records']);
      else if (typeof domains[0] === 'string') {
        cb(null, [url, domains.join(', ')]);
      } else if (domains[0].exchange) {
        cb(null, [url, domains.map(f => `${f.priority} ${f.exchange}`).join(', ')]);
      } else if (domains[0].name) {
        cb(null, domains.map(f => f.name).join(', '));
      } else {
        cb(null, [url, 'I have no clue']);
      }
    });
  }, (err, res) => {
    reply(res.map(obj => `${obj[0]}: ${obj[1]}`).join(' | '));
  });
}

module.exports.commands = ['dns', 'dns'];
module.exports.run = function (r, parts, reply) {
  runDnsFn(dns.resolve4, parts, reply);
};

['4', '6', 'Mx', 'Txt', 'Srv', 'Ns', 'Cname'].forEach((dnsFn) => {
  const fn = dns[`resolve${dnsFn}`];
  module.exports[`run_dns${dnsFn.toLowerCase()}`] = function (r, p, reply) {
    runDnsFn(fn, p, reply);
  };
});
