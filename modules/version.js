var exec = require('child_process').exec;

var ver = require('../package.json').version;

var hash;

module.exports.init = function(b) {
	exec('git rev-parse HEAD', function(error, stdout, stderr) {
		if(error != null) {
			hash = null;
			console.err("git's broken yo");
		}
		hash = stdout;
	});
}

module.exports.run = function(r, parts, reply) {
	reply(ver + ": " + hash);
}

module.exports.commands = ['version'];
