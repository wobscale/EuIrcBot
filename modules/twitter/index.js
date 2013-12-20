var Twit = require('twit');
var conf = require("./config");

var t = new Twit(conf);

var twitRegex = /^(https?\:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)(\/status\/(\d+))?/;

module.exports.url = function(url, reply) {
  var m;
  console.log("Trying " + url);
  if((m = twitRegex.exec(url))) {
    console.log(m);
    if(m[3] && !m[5]) {
      // User page
      console.log(m[3]);
      t.get("/users/show", {screen_name: m[3]}, function(err, res) {
        console.log(err);
        if(err) reply("Error getting user " + m[3]);
        else reply(res.name + ": " + res.description);
      });
    } else {
      var uname = m[3];
      var id = m[5];
      t.get("/statuses/show/:id", {id: id}, function(err, res) {
        if(err) reply("Error getting tweet");
        else reply(res.user.name + ": " + res.text);
      });
    }
  }
};
