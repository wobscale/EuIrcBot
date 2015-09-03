var Twit = require('twit');
var ent = require('ent');
var req = require('request');

var t = null;
var tConf = null;
var bot = null;

var twitRegex = /^(https?\:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)(\/status(es)?\/(\d+))?/;

module.exports.init = function(b) {
  bot = b;
  bot.getConfig("twitter.json", function(err, conf) {
    tConf = conf;
    if(err) bot.say("Unable to load twitter module: " + err);
    try {
      t = new Twit(conf);
    } catch(ex) {
      bot.say("Error loading twitter library: " + ex);
    }
  });
};

module.exports.url = function(url, reply) {
  if(t === null) return reply("Unable to handle twitter url; lib not loaded");

  var m;
  if((m = twitRegex.exec(url))) {
    if(m[3] && !m[6]) {
      // User page
      t.get("/users/show", {screen_name: m[3]}, function(err, res) {
        if(err) reply("Error getting user " + m[3]);
        else reply(ent.decode(res.name) + " (@" + ent.decode(res.screen_name) + "): " + ent.decode(res.description).replace(/\n/g, "\t"));
      });
    } else {
      var uname = m[3];
      var id = m[6];
      t.get("/statuses/show/:id", {id: id}, function(err, res) {
        if(err) reply("Error getting tweet");
        else reply(ent.decode(res.user.name) + " (@" + ent.decode(res.user.screen_name) + "): " + ent.decode(res.text).replace(/\n/g, "\t\t"));
      });
    }
  }
};

module.exports.run_tweet = function(r, parts, reply) {
  if(parts.length === 0) {
    reply('Usage: !tweet post <status> | imgpost <img url> <status> | del <id>');
  }
  else if(parts[0] === 'post') {
    t.post('statuses/update', { status: parts.slice(1).join('') }, function(err, data) {
      if(err) return reply(err);
      reply(tConf.baseUrl + 'status/' + data.id_str);
    });
  }
  else if(parts[0] === 'imgpost') {
    req({url: parts[1], encoding: 'base64'}, function(error, response, body) {
      if(error) return reply(error);
      t.post('media/upload', {media_data: body }, function(err, data) {
        t.post('statuses/update', {status: parts.slice(2).join(''), media_ids: data.media_id_string}, function(err, data) {
          if(err) return reply(err);
          reply(tConf.baseUrl + 'status/' + data.id_str);
        });
      });
    });
  }
  else if(parts[0] === 'del') {
    t.post('statuses/destroy/:id', {id : parts[1] }, function(err, data) {
      if(err) return reply(err);
      reply('Deleted "' + data.text + '"');
    });
  }
}


module.exports.commands = ['quo', 'quoth'];


module.exports.run = function(r, parts, reply, command, from, to) {
  if(to[0] != '#' && to[0] != '&') return;

  var scrollbackModule = bot.modules['sirc-scrollback'];

  if(!scrollbackModule) return console.log("No scrollback, can't tweet");

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, parts, function(err, res) {
    if(err) return reply(err);
    if(res.match(/(pls|#)noquo/)) return reply("don't be a deck, betch");
    
    t.post('statuses/update', {status: res}, function(err, data) {
      if(err) return reply(err);
      reply(tConf.baseUrl + 'status/' + data.id_str);
    });
  });
};
