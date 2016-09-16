module.exports.command = 'conspiracy';
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var groups = [
    'the government', 'the Jews', 'the Goys', 'lizard people', 'scientists', 'doctors',
    'big pharma', 'Monsanto', 'the gays', 'the FDA', 'the IRS', 'the illuminati', 'muslims',
    'the Catholic Church', 'big oil', 'the EPA', 'Communists', 'Facists', 'Marxists',
    'China', 'North Korea', 'ISIS', 'wall street', 'the UN', 'the FBI', 'Russia',
    'aliens', 'NRA'
  ];

  var entities = [
    'Hillary Clinton', 'Obama', 'Hitler', 'Stalin', 'Putin'
  ];

  var objects = [
    'jet fuel', 'steel beams', 'bigfoot', 'vaccines', 'thinking about things',
    'DNC 2016', 'Bernie Sanders', 'chemtrails', 'asbestous', 'UFOs',
    'WMDs', 'aliens'
  ];
  
  var ailments = [
    'cancer',
    'Zika',
    'autism',
    'infertility',
    'AIDs',
    'smallpox',
    'Ebola'
  ]

  var marginalized_groups = [
    'whites', 'blacks', 'homosexuals', 'transexuals', 'children', 'refugees', 'native americans', 'women'
  ];

  var disasters = [
    '9/11', 'Hurricane Katrina', 'Bengazi', 'mandatory vaccinations', 'the Fukushima nuclear disaster', 'the Holocaust',
    'the Kennedy Assassination', 'earthquakes', 'the BP oil spill', 'the moon landing', 'the Columbine massacre',
    'the recession', 'the great depression', 'global warming', 'Roswell'
  ];

  var inventions = [
    'diet soda', 'encryption', 'fraking', 'fluorinated water', 'GMOs', 'NPR', 'TV', 'processed foods',
    'pyamids', 'libraries', 'guns'
  ];

  var motivations = [
    "cover up -object-",
    "cover up -disaster-",
    "distract from -group-",
    "distract from -group- after they caused -disaster-",
    "distract from -disaster-",
    "poison -group-",
    "eracidate -marginalizedgroup-",
    "give -marginalizedgroup- -ailment-",
    "give -marginalizedgroup- -ailment- in retribution for -disaster-",
    "control the masses",
    "control -marginalizedgroup-",
  ];

  var theories = [
    "-object- can't melt -object-",
    "-group- created -object- to -motivation-",
    "-disaster- was an inside job!",
    "-group- are secretly run by -entity-",
    "-group- was created to -motivation-",
    "-invention- was created to -motivation-",
    "-group- are a false front for -group-",
    "-entity- is single-handedly trying to -motivation-",
    "-group- are using -ailment- to -motivation-",
  ];

  var keyword_to_options = {
    'motivation': motivations,  // must go first as contains lower ones.
    'group': groups,
    'object': objects,
    'entity': entities,
    'marginalizedgroup': marginalized_groups,
    'disaster': disasters,
    'ailment': ailments,
    'invention': inventions
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

