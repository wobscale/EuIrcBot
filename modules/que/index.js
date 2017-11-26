
let bot = null;

module.exports.init = function (b) {
  bot = b;
};

module.exports.commands = ['que'];

module.exports.run = function (r, parts, reply, command, from, to) {
  if (!bot.isChannel(to)) { return; }

  const scrollbackModule = bot.modules['sirc-scrollback'];
  if (!scrollbackModule) { return console.log("No scrollback, can't ezquo"); }

  const specs = scrollbackModule.parseSpecs(r);

  if (specs.error !== undefined) {
    return bot.sayTo(from, specs.error);
  }

  scrollbackModule.getScrollbackForSpecs(to, specs, (err, lines) => {
    if (err) { return bot.sayTo(from, err); }

    let spec = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.spec !== spec) {
        spec = line.spec;
        var res = '';
        if (spec.nicks.length > 0) {
          res += spec.nicks.join(', ');
          res += ' ';
        }
        if (spec.regexes.length > 0) {
          res += spec.regexes.map(regex => regex.toString()).join(', ');
          res += ' ';
        }
        res += spec.lines.join(', ');
        res += ':';
        bot.sayTo(from, res);
      }

      var res = `(${line.line}) `;

      formattedLine = scrollbackModule.formatLine(line.content);
      if (formattedLine.match(/(pls|#)noquo/)) { res += "[noquo'd]"; } else { res += formattedLine; }

      bot.sayTo(from, res);
    }
  });
};
