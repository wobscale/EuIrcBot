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

module.exports.commands = ["wi", "wiki", "wikis"];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw, regex)
{
  var requrl = config.base + "?do=search&id="
               + parts.map(encodeURIComponent).join('+');
  console.log("COMMAND: " + command);
  if(command == "wikis" || command == "ws" || command == "wis"
      || (command == "wiki" && parts.length > 1 && (parts[0] == "s" || parts[0] == "search" || parts[0] == "url")))
  {
    if(parts[0] == "s" || parts[0] == "search")
    {
      parts = parts.splice(1, parts.length);
    }
    getContent(reply, parts, requrl, searchWiki);
  }
};

var getContent = function(reply, parts, page, callback)
{
  request.post({ url: config.base, // logs us in
        'form': {
          id: 'start',
          u: config.user,
          do: 'login',
          p: config.pass,
        },
        followAllRedirects: true,
        jar: true, //cookies
      }, 
      function(err, httpResponse, body)
      {
        request({ url: page, jar: true}, // gets the page
          function(err, httpResponse, body)
          {
            callback(reply, parts, body);
          }
        );
      }
  );
};

var searchWiki = function(reply, parts, body)
{
  jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (err, window) {
    var $ = window.$;
    var pageresults = $(".search_quickhits > li");
    var contentresults = $(".search_results > dt");

    // Exact page match, return it
    if(pageresults.length == 1)
    {
      var match = $(".search_quickhits > li:nth-child(1) > a:nth-child(1)");
      reply(createWikiURL(match.attr("href")));
    }
    else if(pageresults.length > 1)
    {
      reply(pageresults.length + " page results: " + config.base 
            + "?do=search&id=" + parts.map(encodeURIComponent).join("+"));
    }
    else if(contentresults.length == 1)
    {
      var match = $(".search_results > dt:nth-child(1) > a:nth-child(1)");
      reply(createWikiURL(match.attr("href")));
    }
    else if(contentresults.length > 1)
    {
      reply(contentresults.length + " content results: " + config.base 
            + "?do=search&id=" + parts.map(encodeURIComponent).join("+"));
    }
    else
    {
      reply("No results");
    }
  }
);

var createWikiURL = function(href)
{
  var uri = URI(config.base);
  return(uri.protocol() + "://" + uri.hostname() + href);
};

};
