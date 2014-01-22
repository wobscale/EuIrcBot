var http = require('http');
var xml2js = require('xml2js');

var nvRegex =  /nicovideo\.jp\/watch\/sm(\d+)/;

function getInfo(id, cb) {
  http.get("http://ext.nicovideo.jp/api/getthumbinfo/sm"+id, function(res) {
    var data = '';
    res.on('data', function(c) { data += c.toString(); });
    res.on('end', function() {
      xml2js.parseString(data, function(err, result) {
        if(err) {
          cb(err);
        } else if(result.nicovideo_thumb_response && result.nicovideo_thumb_response.$.status == "ok") {
          cb(null, result.nicovideo_thumb_response.thumb[0]);
        } else {
          console.log(result);
          cb("Result was NOT ok");
        }
      });
    });
  });
}

function sayInfo(vid, cb) {
  cb(vid.title[0], '-', vid.length[0], '-', vid.view_counter[0], 'views -', vid.description[0]);
}


module.exports.url = function(url, reply) {
  var m;
  if((m = nvRegex.exec(url))) {
    var id = m[1];
    getInfo(id, function(err, res) {
      if(err) reply("Unable to get video info", err);
      else sayInfo(res, reply);
    });
  }
};
