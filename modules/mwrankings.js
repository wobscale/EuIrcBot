var http = require('http');
module.exports.command = "mwrankings";

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  http.get('http://marketwatch-rankings.euank.com/rankings/the-golden-dong', function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });
    res.on('end', function() {
      var ranks;
      try {
        ranks = JSON.parse(data.toString());
      } catch(e) {
        return reply("Error handling response");
      }
      console.log(ranks);
      reply(ranks.map(function(i){return i.rank + '. ' + i.name}).join(' | '));
    });
  });
};
