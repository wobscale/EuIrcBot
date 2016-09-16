module.exports.command = "conspiracy";
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var entities = [
    'the government', 'the Jews', 'the Goys', 'lizard people', 'scientists', 'doctors',
    'big pharma', 'Monsanto', 'the gays', 'FDA', 'IRS', 'the illuminati', 'Hillary Clinton'
  ];

  var objects = [
    'jet fuel', 'steel beams', 'bigfoot', 'vaccines', 'autism', '9/11', 'thinking about things',
    'DNC 2016', 'Bernie Sanders', 'chemtrails'
  ];

  var motivations = [
    "cover up -object-",
    "distract from -entity-",
    "poison -entity-",
    "make -entity- infertile",
  ];

  var theories = [
    "-object- can't melt -object-",
    "-entity- created -object- to -motivation-",
    "-object- was an inside job!",
    "-object- is secretly run by -entity-",
    "-entity- is a false front for -entity-"
  ];

  var keyword_to_options = {
    'motivation': motivations,  // must go first as contains lower ones.
    'entity': entities,
    'object': objects,
  };

  var conspiracy = theories[Math.floor(Math.random() * theories.length)];

  Object.keys(keyword_to_options).forEach(function (key) {
    while (conspiracy.indexOf('-' + key + '-') > -1) {
      var options = keyword_to_options[key];
      var option = options[Math.floor(Math.random() * options.length)];

      conspiracy = conspiracy.replace('-' + key + '-', option);
    }
  });

  reply('Conspiracy theory: ' + conspiracy);
};

