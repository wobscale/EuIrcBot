var http = require('http');
var config;

module.exports.command = "wotd";

module.exports.init = function( bot ) {
  bot.getConfig( "wotd.json", function( err, conf ) {
    if( err ) {
      console.log( err );
    } else {
      config = conf;
    }
  });
}

module.exports.run = function( remainder, parts, reply, command, from, to, text, raw ) {
  var url = "/v4/words.json/wordOfTheDay?api_key=" + config.wotd_key;

  var options = {
    host: "api.wordnik.com",
    path: url
  };

  http.get( options, function( resp ) {
    var data = "";
    resp.on( 'data', function( chunk ) {
      data += chunk;
    });

    resp.on( 'end', function() {
			try {
				var json = JSON.parse(data);
        var msg = json.word + " | " + json.definitions[0].partOfSpeech + " | " + json.definitions[0].text + " | " + json.examples[0].text;
        reply( msg.substring( 0, 500 ) );
			} catch(e) {
			}
    });
  });
}
