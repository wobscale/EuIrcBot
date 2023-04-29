let bot;
let chunks = null;
let numChunksAllowed = 16;
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

  let store = (chunk, user) => {
    chunks.chunk = user;
    bot.writeDataFile(chunkFileName, JSON.stringify(chunks), (err) => {
      if (err) bot.log.error(`Error writing chunks file: ${err}`);
    });
  };

module.exports.commands = {
  topic(a, parts, b, c, user, channel) {
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
        userdunit = chunks[parts.slice(1).join(" ")];
        if (userdunit) {
          bot.client.say(userdunit)
        } else {
          bot.client.say("This chunk is not known to me.");
        }
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