var ping = require('ping-wrapper2');
//TODO, find a better wrapper or make it.
//This one seems to report bad results

module.exports.command = 'ping';

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var times = 5;
  if(parts.length > 1) {
    try {
      times = parseInt(parts[1], 10);
    } catch(e){}
  }
  times = times < 1 ? 1 : times > 15 ? 15 : times;
  var thisPing = ping(parts[0], {count: times});
  var results = [];
  thisPing.on('data', function(aresult) {
    results.push(aresult);
  });
  thisPing.on('exit', function(summary) {
    reply(parts[0] + " - " + summary.sent + " sent, " + summary.recieved + ". " + 
          Math.round(100 * (summary.sent - summary.recieved) / (summary.sent + summary.recieved)) + "% loss, time " + summary.time + "ms - " + 
          " min/avg/max " + results.reduce(function(l,r) { return l.time < r.time ? l : r;}).time + "/" +
          (Math.round(1000 * results.reduce(function(l,r){return {time: l.time + r.time};}).time / results.length)/1000) + "/" +
          results.reduce(function(l,r){return l.time < r.time ? r : l;}).time);
  });
};


module.exports.run(null, ['google.com', 10], console.log);
