exports.command = "drink";

var options;

module.exports.init = function(b) {
  bot = b;
  bot.readDataFile("options.json", function(err, data) {
    if(err) {
      console.log("Error opening options file.");
      options = {};
    } else {
      try {
        options = JSON.parse(data);
      } catch(ex) {
        console.log("Corrupted options.json file. Defaulting to blank...");
        options = {};
      }
    }
  });
};

function normal_random(){
  var pos = [ Math.random(), Math.random() ];
  while ( Math.sin( pos[0] * Math.PI ) > pos[1] ){
    pos = [ Math.random(), Math.random() ];
  }
  return pos[0];
};

rand = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

insult = function() {
  return rand(adj) + ' ' + rand(ing) + ' ' + rand(noun) + rand(suf);
}

exports.run = function(r, p, reply) {
  var diss = '';
  if(p.length > 0) {
    diss = diss + p.join(', ') + ': ';
  }

  reply(diss + 'you ' + insult());
}
