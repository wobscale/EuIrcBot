
module.exports.commands = {
	rand: function(r, parts, reply) {
		reply(parts[Math.floor(Math.random() * parts.length)]);
	},
	multirand: function(r, parts, reply) {
		var results = {};
		console.log(parts);
		for(var i = 0; i < parts[0]; i++) {
			var choice = parts[Math.floor(Math.random() * parts.length)];
			if(typeof results[choice] == "undefined") {
				results[choice] = 1;
			}
			else {
				results[choice] = results[choice] + 1;
			}
		}

// Iterate over map by sorted values and print or whatever
// python:
// for (thing, count) in sorted(results.items(), key=lambda x: x[1]):
//   print(thing + " " + count)
//
// apparently this is a hard problem in computer science
	}

};

