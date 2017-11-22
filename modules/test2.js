
module.exports.name = 'sirc-test2';
module.exports.command = 'test6';

module.exports.run = function (r, p, reply) {
  reply('Hello from test2! A single command can be handled by multiple modules if you just BELIEVE');
};
