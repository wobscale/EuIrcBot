const hn = require('hacker-news-api');
const ent = require('ent');
const qs = require('querystring');
const S = require('string');

const hnRegex = /^https?:\/\/news\.ycombinator\.com\/(.*)/;


module.exports.url = function (url, reply) {
  let m;
  if ((m = hnRegex.exec(url))) {
    if (m[1].indexOf('?') == -1) {
      return; // Don't handle naked links yet, only stories
    }

    const qsToParse = m[1].split('?');
    const query = qs.parse(qsToParse[qsToParse.length - 1]);
    const id = parseInt(query.id, 10);
    if (typeof id !== 'number' || isNaN(id)) return;

    hn.item(id, (err, res) => {
      if (err) return reply('Unable to get HN store info');

      if (res.type == 'story') {
        return reply(`HackerNews - ${res.title} - Posted by: ${res.author}`); // Todo, created-at info
      } else if (res.type == 'comment') {
        let toSay = `${res.author} wrote: ${ent.decode(res.text)}`;
        toSay = S(toSay).stripTags().replaceAll('\n', ' | ').s;
        if (toSay.length < 500) return reply(toSay);
      }
    });
  }
};
