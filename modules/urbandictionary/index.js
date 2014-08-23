var urban = require('urban');

var elems = {
	'ud': ['definition'],
	'udexample': ['example'],
	'urbandict': ['definition', 'example']
};

var use = {
	'ud': 'Define a term',
	'udexample': 'See an example for a term',
	'urbandict': 'See both the definition and an example for a term'
};

function usage(command, reply) {
	reply(command + ' ' + use[command]);
	reply('!' + command + ' <term>');
}

function getFirst(command, term, reply) {
	var result = urban(term);

	result.first(function(json) {
		if(json) {
			elems[command].forEach(function(elem){
				reply(elem + ": " + json[elem]);
			});
		}
		else {
			reply("No entry for " + term);
		}
	});
}

module.exports.commands = ['ud', 'urbandict', 'udexample'];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
	if(remainder.length == 0) {
		usage(command, reply);
	}
	else {
		getFirst(command, remainder, reply);
	}
};

