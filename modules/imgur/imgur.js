var http = require('http');
var async = require('async');

var randomImgurId = function() {
  var validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789';
  var id = '';
  for(var i=0;i<5;i++) {
    id += validChars[(Math.floor(Math.random()*validChars.length))];
  }
  return id;

};

var getRandomImage = function(cb) {
  var id = randomImgurId();
  http.get('http://i.imgur.com/' + id + '.png', function(res) {
    if(res.statusCode == 200) cb(null, id);
    else cb("No image: " + res.statusCode);
  });
};


module.exports.commands = {
  imgur: {
      random: function(r, p, reply) {
        var num = parseInt(p[0]);
        if(num > 15) num = 15;
        if(num < 1 || isNaN(num)) num = 1;

        var count = 0;
        var images = [];
        async.doWhilst(
          function(cb) {
          getRandomImage(function(err, res) {
            if(!err) {
              count++;
              images.push(res);
            }
            cb(null);
          });
        },
        function(){return count < num; },
        function (err) {
          if(err) return reply("Error: " + err);
          if(images.length == 1) return reply("Image: http://i.imgur.com/" + images[0] + ".png");
            reply("Images: http://imgur.com/" + images.join(','));
        });
      }
  }
};
