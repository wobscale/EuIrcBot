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
				var num = 0;
				json['dicks'].forEach(function(dick) {
					reply(dick);
					num++;
					if(num > 16) {
						reply("http://i.imgur.com/WoouIW3.gif");
						break;
					}
				});
			} catch(e) {
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
