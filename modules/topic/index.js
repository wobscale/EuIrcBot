let bot;
let chunks = null;
let numChunksAllowed = 16;
let fs = require('fs');
const chunkFileName = 'chunks.json';

module.exports.init = function (b) {
  bot = b;
  bot.readDataFile(chunkFileName, (err, jsonData) => {
    if (err) {
      bot.log.info('initializing chunks');
      chunks = {};
    } else {
      try {
        chunks = JSON.parse(jsonData);
      } catch (ex) {
        bot.log.warn('Corrupted chunks file! Resetting dict...');
        chunks = {};
      }
    }
  });
}
/*
    store chunks somewhere upon removal from topic
    if possible, store who wrote what chunks
    allow number of chunks displayed in topic to be adjustable
    prevent someone from spamming chunks
    allow chunks to be edited
    allow chunks to be removed
  */

  let store = (chunk, user) => {
    chunks.chunk = user;
    bot.writeDataFile(chunkFileName, JSON.stringify(chunks), (err) => {
      if (err) bot.log.error(`Error writing chunks file: ${err}`);
    });
  };

module.exports.commands = {
  topic(_, parts, _, _, user, channel) {
    let msg;
    chan = bot.client.chanData(channel);
    switch(parts[0]) {
      case 'help':
        bot.client.say(channel, helpMsg);
        return;
        break;

      case 'truncate':
        numChunksAllowed = parseInt(parts[1]);
        let topic = chan.topic;
        if (topic.length >= 300) {
          topic = topic.split("|", numChunksAllowed).join("|");
        }
        break;
      
      case 'pop':
        let topic = chan.topic.split("|").slice(1).join("|");
        break;

      case 'prepend':
        delta = parts.slice(1).join(" ");
        store(delta, user);
        let topic = chan.topic;
        if (topic.length >= 300) {
          topic = topic.split("", numChunksAllowed).join("|");
        }
        msg = `${delta} | ${chan.topic}`;
        break;

      case 'whodunit':
        bot.client.say("Coming Soon^TM");
        return;
        break;

      default:
        msg = parts.join(" ");
        break;
    }
    bot.client.send('TOPIC', channel, msg);
    return;
  },
};