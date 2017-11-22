const http = require('http');

let config;

module.exports.command = 'wotd';

module.exports.init = function (bot) {
  bot.getConfig('wotd.json', (err, conf) => {
    if (err) {
      console.log(err);
    } else {
      config = conf;
    }
  });
};

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const url = `http://api.wordnik.com/v4/words.json/wordOfTheDay?api_key=${config.wotd_key}`;

  http.get(url, (resp) => {
    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      try {
        const json = JSON.parse(data);
        const msg = [json.word];
        if (json.definitions[0].partOfSpeech) msg.push(json.definitions[0].partOfSpeech);
        if (json.definitions[0].text) msg.push(json.definitions[0].text);
        if (json.examples[0] && json.examples[0].text) msg.push(json.examples[0].text);

        reply(msg.join(' | ').substring(0, 500));
      } catch (e) {
      }
    });
  });
};
