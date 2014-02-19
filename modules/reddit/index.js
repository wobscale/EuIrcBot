var S = requre('string');
var http = require('http');

module.exports.url = function(url, reply) {
	http.get(url + '.json', function(res) {
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			try {
				var json = JSON.parse(data);
				var comment_json = json[1]['data']['children']['data']['body_html'];
				var comment = S(comment_json).stripTags().decodeHTMLEntities().s //For some reason functions are applied right-to-left
				
				console.log(comment);
				reply(comment.substring(0,500));
			} catch(e) {
				return reply("Error handling response");
			}
		});
	});
};
