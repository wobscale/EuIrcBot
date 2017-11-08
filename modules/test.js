module.exports.init = function(bot) {};

module.exports.name = "sirc-test";

module.exports.command = "test";


module.exports.commands = ['test2', 'test3', /(t+)test/];
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw, regex) {
	if(typeof regex === "undefined") {
		reply("One of my test commands was called!", "In fact it was", command);
	} else {
		reply("One of my test regex commands was called!", "In fact it was", regex, "which matched", command);
	}
};

module.exports.runTest4 = function(r, p, reply) {
  reply("I was called with test4");
};
module.exports.runTest5 = function(r, p, reply) {
  reply("My parts are:", p.join(', '));
};
module.exports.run_test6 = function(r,p,reply) {
  reply("My name is " + this.name);
};

module.exports.run_testspam = function(r,p,reply) {
  reply("foo\nbar\nbaz");
};

module.exports.run_testscrollback = function(r, p, reply, command, from, to) {
  var scrollbackModule = this.modules['sirc-scrollback'];

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, function(err, res) {
    reply(err, JSON.stringify(res));
  });
};
