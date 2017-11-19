var http = require('http');
var https = require('https');
var googleMaps = require('googlemaps');
var apiKey;

module.exports.commands = ["forecast", "w", "weather"];

module.exports.init = function(bot) {
  bot.getConfig( "weather.json", function( err, conf ) {
    if( err ) {
      bot.log.error(err, "Failed loading config for Weather Module");
    } else {
      apiKey = conf.wunderground_key;
    }
  });
};

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw){
  googleMaps.geocode(remainder, function(err, data) {
    if(err) {
      return reply("Error calling Google Maps API");
    } else {
      if (typeof data.results[0] === "undefined" ) return reply("Error: Couldn't find location");
      var loc = data.results[0].geometry.location;
      var locStr = loc.lat.toString() + ',' + loc.lng.toString();
      switch(command)
      {
        case "w":
          return getWeather(locStr, reply);
        case "weather":
          return getWeather(locStr, reply);
        case "forecast":
          return getForecast(locStr, reply);
        default:
          return reply(`Error, command <${command}> not implemented!`);
      }

    }
  });
};

function getWeather(locStr, reply) {
  http.get(`http://api.wunderground.com/api/${apiKey}/conditions/q/${locStr}.json`, function(res) {
    var wudata = '';
    res.on('data', function(chunk) {
      wudata += chunk;
    });
    var weatherData;
    res.on('end', function() {
      try {
        weatherData = JSON.parse(wudata.toString());
      } catch(e) {
        return reply("Error handling wunderground response");
      }
      if (typeof(weatherData.current_observation) === "undefined") return reply(`Couldn't get Weather for : ${locStr}`);
      var conditions = weatherData.current_observation;
      var display_loc = conditions.display_location.full;
      var temp = conditions.temp_f;
      var weather = conditions.weather;
      var humidity = conditions.relative_humidity;
      var feelsLike = conditions.feelslike_f
      reply(`${display_loc} | ${temp}°F (feels like ${feelsLike}°F), ${weather} | Humidity: ${humidity}`);
   });
 });
}


function getForecast(locStr, reply) {
  http.get(`http://api.wunderground.com/api/${apiKey}/forecast/q/${locStr}.json`, function(res) {
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
        var fcst = forecast[i];
        var fcst_header =  `${fcst.date.weekday} ${fcst.date.month}/${fcst.date.day}: `;
        var fcst_string = `${fcst.conditions} | High: ${fcst.high.fahrenheit}°F  | Low: ${fcst.low.fahrenheit}°F | Precipitation: ${fcst.pop}%`;
        reply(fcst_header + fcst_string);
      }
   });
 });
}
