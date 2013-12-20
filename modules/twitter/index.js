var Twit = require('twit');
var ent = require('ent');
var conf = require("./config");

var t = new Twit(conf);

var twitRegex = /^(https?\:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)(\/status\/(\d+))?/;

module.exports.url = function(url, reply) {
  var m;
  if((m = twitRegex.exec(url))) {
    if(m[3] && !m[5]) {
      // User page
      t.get("/users/show", {screen_name: m[3]}, function(err, res) {
        if(err) reply("Error getting user " + m[3]);
        else reply(ent.decode(res.name) + ": " + ent.decode(res.description));
      });
    } else {
      var uname = m[3];
      var id = m[5];
      t.get("/statuses/show/:id", {id: id}, function(err, res) {
        if(err) reply("Error getting tweet");
        else reply(ent.decode(res.user.name) + ": " + ent.decode(res.text));
      });
    }
  }
};
