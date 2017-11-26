module.exports.command = /^(r+)and/;

module.exports.run = function (r, parts, reply, command) {
  const res = command.match(module.exports.command);
  const levels = res[1].length - 1;

  if (levels > 3 || parts.length > 10 + levels) {
    reply('dicks a million times');
    return;
  }

  if (levels == 0) {
    reply(parts[Math.floor(Math.random() * parts.length)]);
    return;
  }

  const results = {};
  for (let level = 0; level < levels; level++) {
    if (parseInt(parts[level], 10) > 9e5) {
      reply('no');
      return;
    }

    for (let i = 0; i < parseInt(parts[level], 10); i++) {
      const choice = parts[Math.floor(Math.random() * (parts.length - levels)) + levels];
      if (typeof results[choice] === 'undefined') {
        results[choice] = 1;
      } else {
        results[choice] = results[choice] + 1;
      }
    }
  }

  reply(Object.keys(results).sort((k1, k2) => results[k2] - results[k1]).map(k => `${k} ${results[k]} times`).join(', '));
};

