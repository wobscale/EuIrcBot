const http = require('http');
const https = require('https');
const googleMaps = require('googlemaps');

let apiKey;

module.exports.commands = ['forecast', 'w', 'weather'];

module.exports.init = function (bot) {
  bot.getConfig('weather.json', (err, conf) => {
    if (err) {
      bot.log.error(err, 'Failed loading config for Weather Module');
    } else {
      apiKey = conf.wunderground_key;
    }
  });
};

module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  googleMaps.geocode(remainder, (err, data) => {
    if (err) {
      return reply('Error calling Google Maps API');
    }
    if (typeof data.results[0] === 'undefined') return reply("Error: Couldn't find location");
    const loc = data.results[0].geometry.location;
    const locStr = `${loc.lat.toString()},${loc.lng.toString()}`;
    switch (command) {
      case 'w':
        return getWeather(locStr, reply);
      case 'weather':
        return getWeather(locStr, reply);
      case 'forecast':
        return getForecast(locStr, reply);
      default:
        return reply(`Error, command <${command}> not implemented!`);
    }
  });
};

function getWeather(locStr, reply) {
  http.get(`http://api.wunderground.com/api/${apiKey}/conditions/q/${locStr}.json`, (res) => {
    let wudata = '';
    res.on('data', (chunk) => {
      wudata += chunk;
    });
    let weatherData;
    res.on('end', () => {
      try {
        weatherData = JSON.parse(wudata.toString());
      } catch (e) {
        return reply('Error handling wunderground response');
      }
      if (typeof (weatherData.current_observation) === 'undefined') return reply(`Couldn't get Weather for : ${locStr}`);
      const conditions = weatherData.current_observation;
      const display_loc = conditions.display_location.full;
      const temp = conditions.temp_f;
      const weather = conditions.weather;
      const humidity = conditions.relative_humidity;
      const feelsLike = conditions.feelslike_f;
      reply(`${display_loc} | ${temp}°F (feels like ${feelsLike}°F), ${weather} | Humidity: ${humidity}`);
    });
  });
}


function getForecast(locStr, reply) {
  http.get(`http://api.wunderground.com/api/${apiKey}/forecast/q/${locStr}.json`, (res) => {
    let wudata = '';
    res.on('data', (chunk) => {
      wudata += chunk;
    });
    let weatherData;
    res.on('end', () => {
      try {
        weatherData = JSON.parse(wudata.toString());
      } catch (e) {
        return reply('Error handling response');
      }
      if (typeof (weatherData.forecast.simpleforecast.forecastday) === 'undefined') { return reply(`Couldn't get forecast for : ${locStr}`); }

      const forecast = weatherData.forecast.simpleforecast.forecastday;
      for (i = 0; i < forecast.length; ++i) {
        const fcst = forecast[i];
        const fcst_header = `${fcst.date.weekday} ${fcst.date.month}/${fcst.date.day}: `;
        const fcst_string = `${fcst.conditions} | High: ${fcst.high.fahrenheit}°F  | Low: ${fcst.low.fahrenheit}°F | Precipitation: ${fcst.pop}%`;
        reply(fcst_header + fcst_string);
      }
    });
  });
}
