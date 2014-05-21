var http = require('http');
var https = require('https');

module.exports.commands = ["w", "weather"];

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  var str = remainder.replace(/ /g, '+');

  https.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + str 
+'&sensor=false&key=AIzaSyAmHJlkmm4TjqyqISo9LfYGK7NoJSoCFtc', function(res) {
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

      if ( locData.cod == 200 ){
        var address_components = locData.results.address_components;
        var city;
        var state;
        var i;
        for (i = 0; i < address_components.length; ++i)
        {
          if (address_components[i].types.indexOf("locality") != -1)
          {
            city = address_components[i].short_name;
          }
          if (address_components[i].types.indexOf("administrative_area_level_1") != -1)
          {
            state = address_components[i].component.short_name;
          }
        }
        city = city.replace(/ /g, '_');
        var locStr = state + "/" + city;
        http.get('http://api.wunderground.com/api/e2749beacc546174/conditions/q/'
          + locStr + '.json', function(res) {
          var wudata = '';
          res.on('data', function(chunk) {
          wudata += chunk;
          });
          var weatherData;
          result.on('end', function() {
            try {
              weatherData = JSON.parse(wudata.toString());
            } catch(e) {
              return reply("Error handling response");
            }

            if ( weatherData.cod == 200 ){
              var conditions = weatherData.current_observation;
              reply(conditions.display_location.full + ' | ' + conditions.temp_f +
                '°F, '  + conditions.weather + ' | Feels Like: ' +
                conditions.feelslike_f + '°F');
            }     
            else{
              reply("Could not get weather for: " + locStr);
            }
          });
        });
      }else{
        reply("Could not find: " + remainder);
      }
    });
  });
};

