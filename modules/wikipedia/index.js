const wiki = require('wikijs').default;

module.exports.commands = ['wiki', 'wikipedia'];

const urlRegex = /^(?:https?:\/\/)?(?:en\.)?wikipedia\.org\/wiki\/(.+)/;

const errorMessage = term => `No Wikipedia page found for "${term}"`;

function shortSummary(page, withUrl) {
  return page.summary()
    // Get the first "sentence" (hopefully)
    .then(str => str.substr(0, str.indexOf('.') + 1))
    // Truncate with an ellipsis if length exceeds 250 chars
    .then(str => (str.length > 250 ? `${str.substr(0, 250)}...` : str))
    // Append URL if requested
    .then(str => (withUrl ? `${str} <${page.raw.canonicalurl}>` : str));
}

module.exports.run = (remainder, parts, reply) => {
  wiki().search(remainder, 1)
    .then(data => data.results[0])
    .then(wiki().page)
    .then(page => shortSummary(page, true))
    .then(reply)
    .catch(() => reply(errorMessage(remainder)));
};

module.exports.url = (url, reply) => {
  if (urlRegex.test(url)) {
    const [, match] = urlRegex.exec(url);
    const title = decodeURIComponent(match);

    wiki().page(title)
      .then(shortSummary)
      .then(reply)
      .catch(() => reply(errorMessage(title)));
  }
};
