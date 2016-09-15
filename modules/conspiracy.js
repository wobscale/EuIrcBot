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

  var conspiracy = theories[Math.floor(Math.random() * theories.length)];

  while (conspiracy.indexOf('-motivation-') > -1) {
    var motivation = motivations[Math.floor(Math.random() * motivations.length)];
    conspiracy = conspiracy.replace('-motivation-', motivation);
  }

  while (conspiracy.indexOf('-entity-') > -1) {
    var entity = entities[Math.floor(Math.random() * entities.length)];
    conspiracy = conspiracy.replace('-entity-', entity);
  }

  while (conspiracy.indexOf('-object-') > -1) {
    var object = objects[Math.floor(Math.random() * objects.length)];
    conspiracy = conspiracy.replace('-object-', object);
  }

  reply('Conspiracy theory: ' + conspiracy);
};

