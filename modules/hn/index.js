var hn = require('hacker-news-api');
var ent = require('ent');
var qs = require('querystring');
var S = require('string');

var hnRegex =  /^https?:\/\/news\.ycombinator\.com\/(.*)/;



module.exports.url = function(url, reply) {
  var m;
  if((m = hnRegex.exec(url))) {
    if(m[1].indexOf('?') == -1) {
      return; //Don't handle naked links yet, only stories
    }

    var qsToParse = m[1].split('?');
    var query = qs.parse(qsToParse[qsToParse.length - 1]);
    var id = parseInt(query.id, 10);
    if(typeof id !== 'number' || isNaN(id)) return;

    hn.item(id, function(err, res) {
      if(err) return reply("Unable to get HN store info");

      if(res.type == 'story') {
        return reply("HackerNews - " + res.title + " - Posted by: " + res.author); //Todo, created-at info
      } else if(res.type == 'comment') {
        var toSay = res.author + " wrote: " + ent.decode(res.text);
        toSay = S(toSay).stripTags().s;
        if(toSay.length < 500) return reply(toSay);
      }
    });
  }
};
