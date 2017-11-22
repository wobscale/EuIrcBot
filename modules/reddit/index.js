const request = require('request');

const redditRE = /reddit\.com\/[^\s]+|redd\.it\//;

function getCommentText(url, reply) {
  if (!redditRE.test(url)) return;

  request.get(`${url}.json`, (error, resp, body) => {
    if (error) {
      reply(`Could not get comment: ${error}`);
    }
    const data = '';
    try {
      const json = JSON.parse(body);
      const comment = json[1].data.children[0].data.body.replace(/\n+/g, ' | ');

      reply(comment.substring(0, 500));
    } catch (e) {
    }
  });
}

module.exports.commands = {
  reddit(r, p, reply) {
    getCommentText(r, reply);
  },
};
