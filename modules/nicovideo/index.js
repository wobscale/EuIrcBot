const http = require('http');
const xml2js = require('xml2js');

const nvRegex = /nicovideo\.jp\/watch\/sm(\d+)/;

function getInfo(id, cb) {
  http.get(`http://ext.nicovideo.jp/api/getthumbinfo/sm${id}`, (res) => {
    let data = '';
    res.on('data', (c) => { data += c.toString(); });
    res.on('end', () => {
      xml2js.parseString(data, (err, result) => {
        if (err) {
          cb(err);
        } else if (result.nicovideo_thumb_response && result.nicovideo_thumb_response.$.status == 'ok') {
          cb(null, result.nicovideo_thumb_response.thumb[0]);
        } else {
          console.log(result);
          cb('Result was NOT ok');
        }
      });
    });
  });
}

function sayInfo(vid, cb) {
  cb(vid.title[0], '-', vid.length[0], '-', vid.view_counter[0], 'views -', vid.description[0]);
}


module.exports.url = function (url, reply) {
  let m;
  if ((m = nvRegex.exec(url))) {
    const id = m[1];
    getInfo(id, (err, res) => {
      if (err) reply('Unable to get video info', err);
      else sayInfo(res, reply);
    });
  }
};
