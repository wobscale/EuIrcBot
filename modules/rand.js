var _ = require("underscore");

module.exports.command = /(r+)and/;

module.exports.run = function(r, parts, reply, command) {
	var res = command.match(module.exports.command);
	var levels = res[1].length - 1;

	if(levels > 3 || parts.length > 10 + levels) {
		reply("dicks a million times");
		return;
	}

	if(levels == 0) {
		reply(parts[Math.floor(Math.random() * parts.length)]);
		return;
	}

	var results = {};
	for(var level = 0; level < levels; level++) {
		if(parseInt(parts[level],10) > 9e5) { 
			reply("no");
			return;
		}

		for(var i = 0; i < parseInt(parts[level],10); i++) {
			var choice = parts[Math.floor(Math.random() * (parts.length - levels)) + levels];
			if(typeof results[choice] == "undefined") {
				results[choice] = 1;
			}
			else {
				results[choice] = results[choice] + 1;
			}
		}
	}

	reply(
			Object.keys(results)
			.sort(function(k1,k2){return results[k2]-results[k1];})
			.map(function(k) { return k + " " + results[k] + " times"; }) 
			.join(", ")
			);
};

