module.exports.command = 'ping';
var child_process = require('child_process');


module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var times = 5;
  if(parts.length > 1) {
    try {
      times = parseInt(parts[1], 10);
    } catch(e){}
  }
  times = times < 1 ? 1 : times > 15 ? 15 : times;
  var url = parts[0];

  cp = child_process.spawn('ping', ['-c', times.toString(), url]);
  var out = '';
  var err = '';

  cp.stdout.on('data', function(c) { 
    out += c.toString();
  });

  cp.stderr.on('data', function(c) { 
    err += c.toString();
  });

  cp.on('close', function(code) { 
    if(err.length > 0) {
      return reply(err.map(function(i){return i.trim();}).join(' - '));
    }
    lines = out.split("\n").filter(function(x) { return x.trim().length > 0; });
    lines = lines.map(function(l) { return l.replace(/\-*/g, '').trim(); });
    reply(lines.slice(lines.length-3).join(' - ')); 
  });

};
