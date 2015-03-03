var http = require('http');

var url = 'http://dicks-api.herokuapp.com/dicks/';

function getDicks(n, reply) {
	http.get(url + n, function(res) {
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			try {
				var json = JSON.parse(data);
				json['dicks'].forEach(function(dick) {
					reply(dick);
				});
			} catch(e) {
        //console.log(e);
				//return reply("Error handling response");
			}
		});
	});
}

function dicks(r, p, reply) {
	if(p.length > 0) {
		getDicks(p[0], reply);
	}
	else {
		getDicks(1, reply);
	}
}

module.exports.commands = {
	dicks: dicks,
	dick: dicks,
	dongs: dicks,
	dong: dicks,
};