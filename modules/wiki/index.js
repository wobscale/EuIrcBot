var config;
var request = require("request");
var jsdom = require('jsdom');
var util = require('util');
var URI = require('URIjs');

var bot;

var aliasDict = null;
var aliasFile = "wikialiases.json";

module.exports.init = function(b) {
  bot = b;
  bot.getConfig( "wiki.json", function( err, conf ) {
    if( err ) {
      console.log( err );
    } else {
      config = conf;
    }
  });

  // Initalize our alias dict, basically it's a dumbcommand copy
  b.readDataFile(aliasFile, function(err, data) {
    if(err) {
      console.log("Initializing aliasDict");
      aliasDict = {};
    } else {
      try {
        aliasDict = JSON.parse(data);
      } catch(ex) {
        console.log("Corrupted " + aliasFile + " file! Resetting dict...");
        aliasDict = {};
      }
    }
    writeCommands();
  });
};
module.exports.name = "sirc-wiki";

// Funtionality
var search = function(remainder, parts, reply)
{
  var requrl = config.base + "?do=search&id="
               + parts.map(encodeURIComponent).join('+');

  getContent(reply, parts, requrl, searchWiki);
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
            + "?do=search&id=" + parts.join("+"));
    }
    else if(contentresults.length == 1)
    {
      var match = $(".search_results > dt:nth-child(1) > a:nth-child(1)");
      reply(createWikiURL(match.attr("href")));
    }
    else if(contentresults.length > 1)
    {
      reply(contentresults.length + " content results: " + config.base 
            + "?do=search&id=" + parts.join("+"));
    }
    else
    {
      reply("No results");
    }
  }
  );
};

var createWikiURL = function(href)
{
  var uri = URI(config.base);
  return(uri.protocol() + "://" + uri.hostname() + href);
};

var help = function(remainder, parts, reply, command)
{
  if(parts.length == 0 )
  {
    reply("Usage: wi[ki] [<s(earch)>|<a(lias)>|<h(elp)>] [args]");
    reply("  !wiki help <command> for more details");

    return;
  }
  
  switch(parts[0])
  {
    case "s":
    case "search":
      reply("Usage: !wi[ki] (s[earch]|f[ind]) <search query>");
      reply("  Search query can be several parts, separated with spaces. This function will return an exact match if there is one, otherwise a match count and a search link.");
      break;

    case "a":
    case "alias":
      reply("Usage: !wi[ki] a[lias] [<add>|<remove>|<list>] <name> <link>");
      reply("  Allows alias definitions for !wiki <alias> and overrides for !wiki search <alias>."); 
      break;

    case "":
    case "h":
    case "help":
      reply("I hate you.");
      break;

    default:
      reply("Unknown command: \"" + parts[0] + "\".");
      break;
  }
};


// === Dict functions ===
function writeCommands() {
  bot.writeDataFile(aliasFile, JSON.stringify(aliasDict), function(err) {
    if(err) console.log("Error writing command file: " + err);
  });
}

// Exports are down here 

module.exports.commands = {
  wiki: {
    _default: help, 
    help: help,
    search: search,
    test: function(x,y,reply) {
      reply("Hello!");
    }
  },
};

// subcommand alias hash
var aliasMap = { 
  help: ['h', '?'],
  search: ['s', 'f', 'find']
};

Object.keys(aliasMap).map(function (orig) {
  aliasMap[orig].map(function (alias) {
    module.exports.commands['wiki'][alias] = module.exports.commands['wiki'][orig];
  });
});

// Add top level aliases
module.exports.commands['wi'] = module.exports.commands['wiki'];

