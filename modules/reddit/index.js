var request = require('request');

var redditRE = /reddit\.com\/[^\s]+|redd\.it\//;

function getCommentText(url, reply) {
  if(!redditRE.test(url)) return;

  request.get(url + '.json', function(error, resp, body) {
    if(error) {
      reply("Could not get comment: " + error);
    }
    var data = '';
    try {
      var json = JSON.parse(body);
      var comment = json[1].data.children[0].data.body.replace(/\n+/g, ' | ');

      reply(comment.substring(0,500));
    } catch(e) {
    }
  });
}

module.exports.commands = {
  reddit: function(r, p, reply) {
    getCommentText(r, reply);
  }
};
