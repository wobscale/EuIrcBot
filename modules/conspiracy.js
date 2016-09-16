module.exports.command = "conspiracy";
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var groups = [
    'the government', 'the Jews', 'the Goys', 'lizard people', 'scientists', 'doctors',
    'big pharma', 'Monsanto', 'the gays', 'FDA', 'IRS', 'the illuminati', 'muslims',
    'the Catholic Church'
  ];

  var entities = [
    'Hillary Clinton', 'Obama', 'Hitler'
  ];

  var objects = [
    'jet fuel', 'steel beams', 'bigfoot', 'vaccines', 'thinking about things',
    'DNC 2016', 'Bernie Sanders', 'chemtrails', 'GMOs'
  ];
  
  var ailments = [
    "cancer",
    "Zika",
    "autism",
    "infertility"
  ]

  var motivations = [
    "cover up -object-",
    "distract from -group-",
    "distract from -disaster-",
    "poison -group-",
    "eracidate -marginalizedgroup-",
    "give -marginalizedgroup- -ailment-",
    "give -marginalizedgroup- -ailment- in retribution for -disaster-",
  ];

  var marginalized_groups = [
    'whites', 'blacks', 'homosexuals', 'transexuals', 'children'
  ];

  var disasters = [
    '9/11', 'Hurricane Katrina', 'Bengazi', 'mandatory vaccinations'
  ];

  var theories = [
    "-object- can't melt -object-",
    "-group- created -object- to -motivation-",
    "-disaster- was an inside job!",
    "-group- is secretly run by -entity-",
    "-group- are a false front for -group-",
  ];

  var keyword_to_options = {
    'motivation': motivations,  // must go first as contains lower ones.
    'group': groups,
    'object': objects,
    'entity': entities,
    'marginalizedgroup': marginalized_groups,
    'disaster': disasters,
    'ailment': ailments,
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

