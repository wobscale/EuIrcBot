var config = null;
var bot = null;

module.exports.init = function(b) {
	bot = b;

	bot.getConfig('nickserv.json', function(err, conf) {
		console.log(err);
		if(err) return;

		config = conf;

		bot.sayTo(config.nickserv || 'nickserv', 'identify', bot.client.nick, config.password);
	});
}

module.exports.run_register = function(r, parts, reply) {
	console.log(config);
	if(config === null) {
		reply("Please configure a password");
		return;
	}

	if(parts.length < 1) {
		reply("Usage: !register <email address>");
		return;
	}

	bot.sayTo(config.nickserv || 'nickserv', 'register', config.password, parts[0]);
	reply("Registered!");
}
