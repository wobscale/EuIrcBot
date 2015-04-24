var google = require('google'),
    googleimgs = require('google-images'),
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

var firstimg = function(r, p, reply) {
	googleimgs.search(r, function(err, imgs) {
		if(err) return reply("Couldn't find jack, yo: " + err);
		if(imgs.length == 0) return reply("Couldn't find zip, nadda, nothin'");

		return reply(imgs[0].url);
	});
}

module.exports.run_gi = firstimg;
module.exports.run_gimg = firstimg;
module.exports.run_gimgs = firstimg;

module.exports.run_yt = function(r,p,reply, command, from, to, text, raw) {
  return module.exports.run(r + " site:youtube.com inurl:watch", p, reply, command, from, to, text, raw);
}
