
module.exports.commands = {

	rand: function(r, parts, reply) {
		reply(parts[Math.floor(Math.random() * parts.length)]);
	},

	multirand: function(r, parts, reply) {
		if(parseInt(parts[0]) > 9e5) { 
			reply("no");
			return;
		}

		var results = {};
		for(var i = 0; i < parseInt(parts[0]); i++) {
			var choice = parts[Math.floor(Math.random() * (parts.length - 1)) + 1];
			if(typeof results[choice] == "undefined") {
				results[choice] = 1;
			}
			else {
				results[choice] = results[choice] + 1;
			}
		}

		reply(
				Object.keys(results)
				.sort(function(k1,k2){return results[k2]-results[k1];})
				.map(function(k) { return k + " " + results[k] + " times"; }) 
				.join(", ")
			);
	}

};

