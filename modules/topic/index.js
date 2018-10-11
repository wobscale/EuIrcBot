let bot;

module.exports.init = function (b) {
    bot = b;
}

module.exports.commands = {
  topic(_, parts, _, _, user, targetChan) {
    channel = bot.client.chanData(targetChan);
    if (parts[0] === 'prepend') {
      delta = parts.slice(1).join(" ");
      msg = `${delta} | ${channel.topic}`;
    } else {
      msg = parts.join(" ");
    }
    bot.client.send('TOPIC', channel, msg);
  },
};