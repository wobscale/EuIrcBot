const wiki = require('wikijs').default;
const { URL } = require('url');

module.exports.commands = ['wiki', 'wikipedia'];

// Wiki API usage currently configured to make all queries in English language
const wikipediaHostWhitelist = [
  'en.wikipedia.org',
  'www.wikipedia.org',
  'wikipedia.org',
];
const wikipediaPathPrefix = '/wiki/';

const errorMessage = term => `No Wikipedia page found for "${term}"`;

function isWikipediaUrl(url) {
  return wikipediaHostWhitelist.includes(url.hostname)
    && url.pathname.startsWith(wikipediaPathPrefix);
}

function shortSummary(page, withUrl) {
  return page.summary()
    // Limit to 250 chars
    .then(str => str.substr(0, 250))
    // Get the first "sentence" (hopefully)
    .then((str) => {
      const i = str.lastIndexOf('.');
      // If summary contains period
      return i !== -1 ?
        // Truncate to last period
        str.substr(0, i + 1) :
        // Otherwise add an ellipsis
        `${str}...`;
    })
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
  const parsedUrl = new URL(url);
  if (isWikipediaUrl(parsedUrl)) {
    const urlTitle = parsedUrl.pathname.slice(wikipediaPathPrefix.length);
    const title = decodeURIComponent(urlTitle);

    wiki().page(title)
      .then(shortSummary)
      .then(reply)
      .catch(() => reply(errorMessage(title)));
  }
};
