var urban = require('urban');

var elems = {
	'ud': ['definition'],
	'udexample': ['example'],
	'urbandict': ['definition', 'example']
};

module.exports.commands = ['ud', 'urbandict', 'udexample'];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
	var result = urban(remainder);

	result.first(function(json) {
		if(json) {
			elems[command].forEach(function(elem){
				reply(elem + ": " + json[elem]);
			});
		}
		else {
			reply("No entry for " + remainder);
		}
	});
};
