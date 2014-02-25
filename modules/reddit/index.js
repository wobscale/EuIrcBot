var http = require('http');

var redditRE = /reddit\.com\/[^\s]+|redd\.it\//;

module.exports.disabled = true;

// TODO, handle more htan just comments. E.g. subreddit descriptions
module.exports.url = function(url, reply) {
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
};
