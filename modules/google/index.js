var google = require('google'),
    humanize = require('humanize');

var b;

module.exports.init = function(bot) {
  b = bot;
};

module.exports.commands = ['g', 'google'];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  google(remainder, function(err, next, links) {
    if(err || links.length === 0) { return reply("No results"); }
    for(var i=0;i<links.length;i++) {
      if(links[i].link === null) continue;
      else {
        return reply(links[i].link.replace('(', '%28').replace(')','%29') +" -> " + links[i].title);
      }
    }
  });
};

module.exports.run_goognum = function(r, p, reply) {
  google(r, function(err, next, links, num) {
    if(err || links.length === 0) return reply("0 results");

    return reply(humanize.numberFormat(num,0) + " results");
  });
};
