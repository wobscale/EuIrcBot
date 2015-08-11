var config;
var request = require("request");
var jsdom = require('jsdom');

module.exports.init = function(bot) {
  bot.getConfig( "wiki.json", function( err, conf ) {
    if( err ) {
      console.log( err );
    } else {
      config = conf;
    }
  });
};
module.exports.name = "sirc-wiki";

module.exports.commands = ["wi", "wiki"];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw, regex)
{
  var wikisearchurl = "https://wiki.mst.edu/deskinst/start?do=search&id=";
  reply("Unencoded parts", parts.join(', '));

  // Encode our part(s)
  parts.map(encodeURIComponent);
  reply("Encoded parts", parts.join(', '));

  // Do a search
  request.get(wikisearchurl + parts.join('&'), {
    'auth': {
      'user': config.user,
      'pass': config.pass,
      'sendImmediately': config.sendImmediately
    }
  },
  function process(err, httpResponse, body)
  {
    console.log("URL Retrieved: " + wikisearchurl + parts.join('+'));
    console.log("HTTP Error Code: " + httpResponse);
    //console.log(body);
  }
  
  );

};
