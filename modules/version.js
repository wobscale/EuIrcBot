var exec = require('child_process').exec;

var hash;

module.exports.init = function(b) {
	exec('git rev-parse HEAD', function(error, stdout, stderr) {
		if(error != null) {
			hash = null;
			console.err("git's broken yo");
		}
		hash = stdout;
		console.log(hash);
	});
}

module.exports.run = function(r, parts, reply) {
	reply(hash);
}

module.exports.commands = ['version', 'head', 'hash'];
