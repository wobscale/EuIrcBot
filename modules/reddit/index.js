var http = require('http');

var redditRE = /reddit\.com\/[^\s]+|redd\.it\//;

function getCommentText(url, reply) {
  if(!redditRE.test(url)) return;
	http.get(url + '.json', function(res) {
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			try {
				var json = JSON.parse(data);
				var comment = json[1].data.children[0].data.body.replace(/\n/g, '\t');
				
				reply(comment.substring(0,500));
			} catch(e) {
        //console.log(e);
				//return reply("Error handling response");
			}
		});
	});
}

module.exports.commands = {
  reddit: function(r, p, reply) {
    getCommentText(r, reply);
  }
};
