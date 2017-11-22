module.exports.command = 'ping';
const child_process = require('child_process');


module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  let times = 5;
  if (parts.length > 1) {
    try {
      times = parseInt(parts[1], 10);
    } catch (e) {}
  }
  times = times < 1 ? 1 : times > 15 ? 15 : times;
  const url = parts[0];

  cp = child_process.spawn('ping', ['-c', times.toString(), url]);
  let out = '';
  let err = '';

  cp.stdout.on('data', (c) => {
    out += c.toString();
  });

  cp.stderr.on('data', (c) => {
    err += c.toString();
  });

  cp.on('close', (code) => {
    if (err.length > 0) {
      err = err.split('\n').map(x => x.trim()).filter(x => x !== '');
      return reply(err.join(' - '));
    }
    lines = out.split('\n').filter(x => x.trim().length > 0);
    lines = lines.map(l => l.replace(/\-*/g, '').trim());
    console.log(lines);
    reply(lines.slice(lines.length - 3).join(' - '));
  });
};
