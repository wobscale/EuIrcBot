module.exports.name = 'sirc-testlog';

module.exports.run_testlog = function (remainder, parts, reply, command, from, to, text, raw, regex) {
  this.log.info(parts);
  reply('logged at info');
};

module.exports.run_testlog2 = function (remainder, parts, reply, command, from, to, text, raw, regex) {
  const self = this;
  process.nextTick(() => {
    self.log.info(parts);
    reply('logged in a callback');
  });
};

module.exports.run_testlog3 = function (remainder, parts, reply, command, from, to, text, raw, regex) {
  process.nextTick(() => {
    module.exports.log.info(parts);
    reply('logged in a callback via module');
  });
};


let l;
module.exports.init = function () {
  l = this.log;
};

module.exports.run_testlog4 = function (remainder, parts, reply, command, from, to, text, raw, regex) {
  process.nextTick(() => {
    l.info(parts);
    reply('logged in a callback via a module-scoped variable');
  });
};
