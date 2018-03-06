const wiki = require('wikijs').default;

module.exports.commands = ['wiki', 'wikipedia'];

function prettyPage(page) {
  return page.summary()
    // Get the first "sentence" (hopefully)
    .then(str => str.substr(0, str.indexOf('.') + 1))
    // Truncate with an ellipsis if length exceeds 250 chars
    .then(str => (str.length > 250 ? `${str.substr(0, 250)}...` : str))
    // Append Wikipedia URL
    .then(str => `${str} <${page.raw.canonicalurl}>`);
}

module.exports.run = function run(remainder, parts, reply) {
  wiki().search(remainder, 1)
    .then(data => data.results[0])
    .then(wiki().page)
    .then(prettyPage)
    .then(reply)
    .catch(() => reply(`No Wikipedia page found for "${remainder}"`));
};
