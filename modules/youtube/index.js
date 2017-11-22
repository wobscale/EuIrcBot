const goog = require('googleapis');

const OAuth2 = goog.auth.OAuth2;
const yt = goog.youtube({ version: 'v3' });
const moment = require('moment');


let apiKey = '';
module.exports.init = function (b) {
  b.getConfig('google.json', (err, conf) => {
    if (!err) {
      apiKey = conf.apiKey;
    }
  });
};

const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;

function formatPt50(pt50) {
  const duration = moment.duration(pt50);
  let hours = duration.hours();
  let minutes = duration.minutes();
  let seconds = duration.seconds();
  if (hours < 10) { hours = `0${hours}`; }
  if (minutes < 10) { minutes = `0${minutes}`; }
  if (seconds < 10) { seconds = `0${seconds}`; }
  const time = `${hours}:${minutes}:${seconds}`;
  return time;
}

function likePercent(vid) {
  try {
    const like = parseInt(vid.statistics.likeCount, 10);
    const hate = parseInt(vid.statistics.dislikeCount, 10);
    if (hate === 0) {
      // divide by 0
      if (like === 0) {
        return 'N/A';
      }
      return '100%';
    }
    return `${(like / (like + hate) * 100).toString().substr(0, 4)}%`;
  } catch (ex) {
    console.log('Ty google for giving me this video which is screwed', vid);
    return '?%';
  }
}

function sayInfo(vid, cb, sayUrl) {
  const url = `http://youtu.be/${vid.id}`;
  cb((sayUrl ? (`${url} `) : '') + vid.snippet.title, '-', formatPt50(vid.contentDetails.duration), `${vid.statistics.viewCount ? `- ${vid.statistics.viewCount} views` : ''}(${likePercent(vid)}) - ${vid.snippet.channelTitle}`);
}


function sayIdInfo(id, cb, sayUrl) {
  yt.videos.list({ auth: apiKey, id, part: 'snippet,statistics,contentDetails' }, (err, results) => {
    if (results.items.length > 0) {
      sayInfo(results.items[0], cb, sayUrl);
    }
  });
}

module.exports.url = function (url, reply) {
  if (apiKey === '') return;
  let m;
  if ((m = ytRegex.exec(url))) {
    const id = m[1];
    sayIdInfo(id, reply, false);
  }
};

module.exports.commands = ['yt', 'youtube'];
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  if (apiKey === '') return;
  yt.search.list({
    auth: apiKey, part: 'id', type: 'video', q: remainder, maxResults: 1,
  }, (err, res) => {
    if (err || res.items.length < 1) return reply('No results');
    const vidId = res.items[0].id.videoId;
    sayIdInfo(vidId, reply, true);
  });
};
