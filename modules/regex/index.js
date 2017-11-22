const lastSaid = {};
const replaceRegex = /^s\/(.*?)\/(.*?)(?:(?:\/g)|(?:\/))?$/;

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

module.exports.msg = function (text, from, reply, raw) {
  match = replaceRegex.exec(text);
  if (match) {
    // Replace the last thing the person said, if anything
    if (lastSaid[from] != undefined) {
      let personLastSaid = lastSaid[from],
        find = match[1],
        replace = match[2];
      const fixed = replaceAll(find, replace, personLastSaid);

      if (fixed != personLastSaid) {
        const response = `<${from}> ${fixed}`;

        reply(response);
      }
    }
  } else {
    // The proper way to do this would be with scrollback module but w/e
    lastSaid[from] = text;
  }
};
