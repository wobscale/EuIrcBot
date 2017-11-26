const wolfram = require('wolfram-alpha');

let wc = null;

module.exports.init = function (bot) {
  bot.getConfig('wolfram.json', (err, conf) => {
    if (err) console.log(`Unable to load wolfram module: ${err}`);
    try {
      wc = new wolfram.createClient(conf.appid);
    } catch (ex) {
      bot.say(`Error loading wolfram library: ${ex}`);
    }
  });
};

module.exports.commands = ['wolf', 'wolfram', 'wolframalpha', 'wa'];

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  if (wc === null) {
    return reply('Unable to handle wolfram request; lib not loaded');
  }

  wc.query(remainder, function (err, res) {
    if (err) return reply(`Wolfram error: ${err}`);
    if (!(res && res.length)) return reply('Wolfram error, response is dicked');

    if (res.length === 1) {
      return reply(`No result for query: ${res[0].subpods[0].text}`);
    }

    const r = function (...args) {
      reply.custom({ lines: 5, pmExtra: true, replaceNewlines: true }, ...args);
    };

    const primary_pods = res.filter(x => x.primary);
    if (primary_pods.length === 0) {
      try {
        return r(`${res[0].subpods[0].text}: ${res[1].subpods[0].text}`);
      } catch (ex) {
        return r(`No primary pod, try http://www.wolframalpha.com/input/?i=${encodeURIComponent(remainder)}`);
      }
    }

    const ppod = primary_pods[0];
    if (!ppod.title) {
      this.log.error('unrecognized primary pod: ', ppod);
      r('Not sure how to handle primary pod, someone should pull request this');
      return;
    }
    let title = '';
    if (ppod.title != 'Result') {
      title = ppod.title;
    }
    const subval = subpodValue(ppod.subpods[0]);

    if (title && subval) {
      r(`${title}: ${subval}`);
    } else if (title) {
      r(title);
    } else {
      r(subval);
    }
  });
};

// subpodValue, given a subpod, attempts to figure out the correct thing to print.
// Currently, that just means any non-empty item from value, text, image,
// preferring them in that order.
// In the future, it's quite plausible the image may be useful for some queries.
// Right now, it's often a duplicate of the text content if text is available.
function subpodValue(subpod) {
  return [
    subpod.value,
    subpod.text,
    subpod.image,
  ].find(val => val);
}
