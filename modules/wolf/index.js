const wolfram = require('wolfram-alpha');

let wc = null;

module.exports.init = function (bot) {
  bot.getConfig('wolfram.json', (err, conf) => {
    if (err) console.log(`Unable to load wolfram module: ${err}`);
    try {
      wc = new wolfram.createClient(conf.appid); // eslint-disable-line new-cap
    } catch (ex) {
      bot.say(`Error loading wolfram library: ${ex}`);
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

module.exports.commands = ['wolf', 'wolfram', 'wolframalpha', 'wa'];

module.exports.run = function (remainder, parts, reply) {
  if (wc === null) {
    reply('Unable to handle wolfram request; lib not loaded');
    return;
  }

  // TODO: Update to use Promise API instead
  wc.queryCb(remainder, (err, res) => {
    if (err) {
      reply(`Wolfram error: ${err}`);
      return;
    }
    if (!(res && res.length)) {
      reply('Wolfram error, response is dicked');
      return;
    }

    if (res.length === 1) {
      reply(`No result for query: ${res[0].subpods[0].text}`);
      return;
    }

    const interp = subpodValue(res[0].subpods[0]);

    const r = function (...args) {
      reply.custom({ lines: 5, pmExtra: true, replaceNewlines: true }, ...args);
    };

    const primary_pods = res.filter(x => x.primary);
    if (primary_pods.length === 0) {
      try {
        r(`${interp}: ${res[1].subpods[0].text}`);
        return;
      } catch (ex) {
        r(`No primary pod, try http://www.wolframalpha.com/input/?i=${encodeURIComponent(remainder)}`);
        return;
      }
    }

    const ppod = primary_pods[0];
    if (!ppod.title) {
      this.log.error('unrecognized primary pod: ', ppod);
      r('Not sure how to handle primary pod, someone should pull request this');
      return;
    }
    const titleParts = [];
    if (interp !== remainder) {
      titleParts.push(interp);
    }
    if (ppod.title !== 'Result' && ppod.title !== 'Response') {
      titleParts.push(ppod.title);
    }
    const subval = subpodValue(ppod.subpods[0]);

    const title = titleParts.join(': ');

    if (title && subval) {
      r(`${title}: ${subval}`);
    } else if (title) {
      r(title);
    } else {
      r(subval);
    }
  });
};

