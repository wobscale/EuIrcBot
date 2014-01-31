var yt = require('youtube-feeds');

var ytRegex =  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;

function formatSecs(secs) {
    sec_numb = secs;
    var hours   = Math.floor(sec_numb / 3600);
    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
    var seconds = sec_numb - (hours * 3600) - (minutes * 60);
    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

function sayInfo(vid, cb) {
  var url = 'http://youtu.be/' + vid.id;
  cb(url, vid.title, '-', formatSecs(vid.duration), (vid.viewCount ? '- ' + vid.viewCount + ' views' : ''));
}


module.exports.url = function(url, reply) {
  var m;
  if((m = ytRegex.exec(url))) {
    var id = m[1];
    yt.video(id).details(function(err, res) {
      if(err) reply("Invalid video:", err);
      else sayInfo(res, reply);
    });

  }
};

module.exports.commands = ['yt', 'youtube'];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  yt.feeds.videos({q: remainder}, function(err,res) {
    if(err || res.totalItems < 1) return reply("No results");
    var vid = res.items[0];
    sayInfo(vid, reply);
  });
};
