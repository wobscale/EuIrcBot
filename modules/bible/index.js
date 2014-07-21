var bref = require('bible-ref');
var nb = require('net-bible-api');


module.exports.command = "bible";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var norm = bref.bookNormalize(remainder);
  nb.get(bref.bookNormalize("1CO 1:1-4")).then(function(data) { 
    var res = data.map(function(el) {
      return el.text;
    }).join(' ');
    reply(res.substring(0, 300) + '...');
  });
};
