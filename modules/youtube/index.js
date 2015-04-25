var goog = require('googleapis');
var OAuth2 = goog.auth.OAuth2;
var yt = goog.youtube({version: 'v3'})
var moment = require('moment');


var apiKey = "";
module.exports.init = function(b) {
	b.getConfig("google.json", function(err, conf) {
		apiKey = conf.apiKey
	});
};

var ytRegex =  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;

function formatPt50(pt50) {
	var duration = moment.duration(pt50);
	var hours   = duration.hours()
	var minutes = duration.minutes()
	var seconds = duration.seconds()
	if (hours   < 10) {hours   = "0"+hours;}
	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}
	var time    = hours+':'+minutes+':'+seconds;
	return time;
}

function likePerecent(vid) {
	try {
		var like = parseInt(vid.statistics.likeCount, 10);
		var hate = parseInt(vid.statistics.dislikeCount, 10);
		return (like / (like + hate) * 100).toString().substr(0, 4) + "%";
	} catch(ex) {
		console.log("Ty google for giving me this video which is screwed", vid)
		return "?%";
	}
}

function sayInfo(vid, cb, sayUrl) {
  var url = 'http://youtu.be/' + vid.id;
  cb((sayUrl ? (url + " ") : '') + vid.snippet.title, '-', formatPt50(vid.contentDetails.duration), (vid.statistics.viewCount ? '- ' + vid.statistics.viewCount + ' views' : '') + "(" + likePerecent(vid) + ") - " + vid.snippet.channelTitle);
}


function sayIdInfo(id, cb, sayUrl) {
	yt.videos.list({auth: apiKey, id: id, part: "snippet,statistics,contentDetails"}, function(err, results) {
		if(results.items.length > 0) {
			sayInfo(results.items[0], cb, sayUrl)
		}
	});
}

module.exports.url = function(url, reply) {
	if(apiKey == "") return;
	var m;
	if((m = ytRegex.exec(url))) {
		var id = m[1];
		sayIdInfo(id, reply, false);
	}
};

module.exports.commands = ['yt', 'youtube'];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
	if(apiKey == "") return;
	yt.search.list({auth: apiKey, part: "id", type: "video", q: remainder, maxResults: 1}, function(err,res) {
		if(err || res.items.length < 1) return reply("No results");
		var vidId = res.items[0].id.videoId;
		sayIdInfo(vidId, reply, true);
  });
};
