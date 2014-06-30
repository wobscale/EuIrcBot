var http = require('http');
var https = require('https');
var config;

module.exports.commands = ["forecast", "w", "weather", "daily"];

module.exports.init = function(bot) {
  bot.getConfig( "weather.json", function( err, conf ) {
    if( err ) {
      console.log( err );
    } else {
      config = conf;
    }
  });
};

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw){
  var locStr;
  locStr = remainder.replace(/ /g, '+');

  https.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + locStr 
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
      var country, longCountry;
      var i;
      for (i = 0; i < address_components.length; ++i)
      {
        if (address_components[i].types.indexOf("country") != -1)
        {
          country = address_components[i].short_name;
          longCountry = address_components[i].long_name;
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
      
      if (typeof(city) === "undefined" || typeof(longCountry) === "undefined")
        return reply("Error: Couldn't find city/country");
      console.log("country = " + longCountry);
      console.log("state = " + state);
      console.log("city = " + city);
      city = city.replace(/ /g, '_');
      if (country != "US")
        locStr = longCountry + "/" + city;
      else
        locStr = state + "/" + city;

      switch(command)
      {
        case "w":
          return getWeather(locStr, reply);
        case "weather":
          return getWeather(locStr, reply);
        case "forecast":
          return getForecast(locStr, reply);
        case "daily":
          break;
        default:
          return reply("Error, command <" + command + "> not implemented!");
      }

    });
  });
}

function getWeather(locStr, reply) {
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
      if (typeof(weatherData.current_observation) === "undefined")
        return reply("Couldn't get Weather for : " + locStr);
      var conditions = weatherData.current_observation;
      reply(conditions.display_location.full + ' | ' + conditions.temp_f +
        '°F, '  + conditions.weather + ' | Humidity: ' +
        conditions.relative_humidity);
   });
 });
}


function getForecast(locStr, reply) {
  http.get('http://api.wunderground.com/api/' + config.wunderground_key 
      + '/forecast/q/' + locStr + '.json', function(res) {
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
      if (typeof(weatherData.forecast.simpleforecast.forecastday) === "undefined")
        return reply("Couldn't get forecast for : " + locStr);

      var forecast = weatherData.forecast.simpleforecast.forecastday;
      for(i = 0; i < forecast.length; ++i)
      {
        reply(forecast[i].date.weekday + ' ' + forecast[i].date.month + '/' +
          forecast[i].date.day + ': ' + forecast[i].conditions + ' | High: ' +
          forecast[i].high.fahrenheit +  '°F  | Low: ' +
          forecast[i].low.fahrenheit + '°F | Precipitation: ' +
          forecast[i].pop + '%');
     }
   });
 });
}
