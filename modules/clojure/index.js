

const u = require('./utils');
const repl = require('./repl');

module.exports.command = 'clj';

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  repl.evalClj(remainder).then(reply);
};
