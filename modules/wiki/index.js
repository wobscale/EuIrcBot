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
    writeAliases();
  });
};
module.exports.name = "sirc-wiki";

// Funtionality

// Eventually this will let you do cool stuff like grab the nth item
// callback should take reply, result, and $
var query = function(remainder, parts, reply, callback)
{
  var requrl = config.base + "?do=search&id="
               + parts.map(encodeURIComponent).join('+');

  handleContent(reply, parts, requrl, callback);
};

var search = function(remainder, parts, reply)
{
  query(remainder, parts, reply, searchReply);
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

var searchReply = function(reply, parts, $)
{
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
};

//callback takes reply, parts, and $
var handleContent = function(reply, parts, body, callback)
{
  jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (err, window) {

    callback(reply, parts, window.$);
  }
  );
}

var createWikiURL = function(href)
{
  var uri = URI(config.base);
  return(uri.protocol() + "://" + uri.hostname() + href);
};

var alias = function(remainder, parts, reply, command, from)
{
  // Remove alias subcommand
  var arg = parts[0];
  parts = parts.slice(1,parts.length);
  switch(arg)
  {
    case "a":
    case "new":
    case "n":
    case "add":
      if(parts.length < 2) return reply("add must have two or more args!");
      var alias = parts[0];
      var query = parts.slice(1,parts.length);

      for(var key in Object.keys(aliasMap))
      {
        if(key === alias)
          return reply("Go to hell.");

        for(var hardalias in aliasMap[key])
        {
          if(alias == hardalias)
            return reply("You're an asshole.");
        }
      }
      var exists = aliasDict[alias];
      aliasDict[alias] = {};

      query(remainder, parts, reply, function(reply, result, $) {
          aliasDict[alias].alias = result;
        }
      );
      aliasDict[alias].blame = from;

      if(exists) reply("Overwring alias " + alias);
      else       reply("Added alias " + alias);
      reply("Evaluates to: " + aliasDict[alias].alias); 

      writeAliases();
      break;

    case "d":
    case "delete":
    case "r":
    case "remove":
      if(parts.length !== 1) return reply("remove must have *exactly* one argument");

      if(typeof aliasDict[parts[0]] === 'undefined') return reply("No such alias");

      delete aliasDict[parts[0]];
      reply("Removed alias " + parts[0]);

      writeAliases();
      break;

    case "l":
    case "list":
    case "show":
    case "s":
      if(parts.length === 0) {
        reply("Aliases: " + Object.keys(aliasDict).join(","));
      } else {
        reply(parts.map(function(key) { return aliasDict[key] ? key + " -> " + aliasDict[key] : ''; })
            .filter(function(item) { return item.length > 0; }).join(" | "));
      }
    break;
  }
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
      reply("Usage: !wi[ki] a[lias] [<add>|<remove>|<list>] <name> <query>");
      reply("  Allows alias definitions for !wiki <alias> and overrides for !wiki search <alias>."
            + " <query> should be a search-compatible query. The query's result is cached and returned."); 
      break;

    case "":
    case "h":
    case "help":
      reply("I hate you.");
      break;
    
    default:
      parts = parts.slice(1,parts.length);
      if(aliasDict[parts.join(" ")])
        reply(aliasDict[parts.join(" ")]);
      else
        reply("Unknown alias \"" + parts.join(" ") + "\".");
      break;
  }
};


var aliasHandler = function(remainder, parts, reply, command)
{
  console.log("Alias lookup: " + parts.join(" "));
  if(aliasDict[parts.join(" ")])
     reply(commandDict[command].command);

};

// === Dict functions ===
function writeAliases() {
  bot.writeDataFile(aliasFile, JSON.stringify(aliasDict), function(err) {
    if(err) console.log("Error writing command file: " + err);
  });
}

// Exports are down here 

module.exports.commands = {
  wiki: {
    _default: aliasHandler, 
    help: help,
    search: search,
    alias: alias
  }
};

// subcommand alias hash
var aliasMap = { 
  help: ['h', '?'],
  search: ['s', 'f', 'find'],
  alias: ['a']
};

Object.keys(aliasMap).map(function (orig) {
  aliasMap[orig].map(function (alias) {
    module.exports.commands['wiki'][alias] = module.exports.commands['wiki'][orig];
  });
});

// Add top level aliases
module.exports.commands['wi'] = module.exports.commands['wiki'];

