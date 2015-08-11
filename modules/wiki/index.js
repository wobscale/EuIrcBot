var config;
var request = require("request");
var jsdom = require('jsdom');
var util = require('util');
var URI = require('URIjs');

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
  // auth
  // This logs us in.....
  request.post({ url: config.base,
      'form': {
        id: 'start',
        u: config.user,
        do: 'login',
        p: config.pass,
      },
      followAllRedirects: true,
      jar: true,
  }, function (err, httpResponse, body) {
    request({ url: config.base,
      qs: {
        do: 'search',
        id: parts.map(encodeURIComponent).join('&')
      },
      jar: true
    },
    function (err, httpResponse, body) {
      processWikiContent(reply, parts, body);
    });
});

};

var processWikiContent = function(reply, parts, body)
{
  jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (err, window) {
    var $ = window.$;
    var results = $(".search_quickhits > li");

    if(results.length > 1)
    {
      reply(results.length + " results: " + config.base 
            + "?do=search&id=" + parts.map(encodeURIComponent));
    }
    else if(results.length == 0)
    {
      reply("No results");
    }
    else
    {
      var uri = URI(config.base);
      var match = $(".search_quickhits > li:nth-child(1) > a:nth-child(1)");
      reply(uri.protocol() + "://" + uri.hostname() + match.attr("href"));
    }
  });

};
