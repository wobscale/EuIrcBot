var http = require('http');
var https = require('https');
var config;

module.exports.commands = ["w", "weather"];

module.exports.init = function(bot) {
  bot.getConfig( "weather.json", function( err, conf ) {
    if( err ) {
      console.log( err );
    } else {
      config = conf;
    }
  });
};

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var str = remainder.replace(/ /g, '+');

  https.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + str 
+'&sensor=false&key=' + config.google_key, function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });
    var locData;
    res.on('end', function() {
      try {
        locData = JSON.parse(data.toString());
      } catch(e) {
        return reply("Error handling response");
      }

      if (typeof(locData.results[0]) === "undefined" )
        return reply("Error: Couldn't find city/state");
      var address_components = locData.results[0].address_components;
      var city;
      var state;
      var country;
      var i;
      for (i = 0; i < address_components.length; ++i)
      {
        if (address_components[i].types.indexOf("country") != -1)
        {
          country = address_components[i].short_name;
        }

        if (address_components[i].types.indexOf("locality") != -1)
        {
          city = address_components[i].short_name;
        }
        
        if (address_components[i].types.indexOf("administrative_area_level_1") != -1)
        {
          state = address_components[i].short_name;
        }
      }
      if (country != "US")
        return reply("Error: Location is not in the United States!");
      if (typeof(city) === "undefined" || typeof(state) === "undefined")
        return reply("Error: Couldn't find city/state");

      city = city.replace(/ /g, '_');
      var locStr = state + "/" + city;
      http.get('http://api.wunderground.com/api/' + config.wunderground_key 
        + '/conditions/q/' + locStr + '.json', function(res) {
        var wudata = '';
        res.on('data', function(chunk) {
        wudata += chunk;
        });
        var weatherData;
        res.on('end', function() {
          try {
            weatherData = JSON.parse(wudata.toString());
          } catch(e) {
            return reply("Error handling response");
          }

          var conditions = weatherData.current_observation;
          reply(conditions.display_location.full + ' | ' + conditions.temp_f +
            '°F, '  + conditions.weather + ' | Humidity: ' +
            conditions.relative_humidity);
        });
      });
    });
  });
};

