var ping = require('pinger');
var async = require('async');

module.exports.command = 'ping';

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var times = 5;
  if(parts.length > 1) {
    try {
      times = parseInt(parts[1], 10);
    } catch(e){}
  }
  times = times < 1 ? 1 : times > 15 ? 15 : times;
  var url = parts[0];

  var results = [];
  var pingQueue = async.queue(function(task, cb) {
    ping(url, function(err, ms) {
      if(err) results.push({timeout: true});
      else results.push({timeout: false, time: ms});
      cb();
    });
  },1);

  var startTime = new Date().getTime();
  pingQueue.drain = function() {
    var sent = results.length;
    var timeouts = results.map(function(i){return i.timeout ? 1 : 0;}).reduce(function(l,r){return l+r;});
    var success = results.map(function(i){return i.timeout ? 0 : 1;}).reduce(function(l,r){return l+r;});
    var percentLoss = Math.round(100 * 100 * (timeouts / sent)) * 100;
    var timeTaken = (new Date().getTime()) - startTime;
    var successes = results.filter(function(i) { return !i.timeout;});
    var min,max,avg;
    if(successes.length === 0) {
      min = max = avg = '-';
    } else {
      min = successes.reduce(function(l,r){return l.time < r.time ? l : r;}).time;
      avg = successes.reduce(function(l,r){return {time: l.time + r.time};}).time / successes.length;
      avg = Math.round(1000 * avg) / 1000;
      max = successes.reduce(function(l,r){return l.time > r.time ? l : r;}).time;
    }

    reply(url + " - " + sent + " sent, " + success + ". " + 
          percentLoss + "% loss, time " + timeTaken + "ms - " + 
          " min/avg/max " + min + "/" + avg + "/" + max);
  };
  for(var i=0;i<times;i++) {
    pingQueue.push({});
  }


};


module.exports.run(null, ['google.com', 10], console.log);
