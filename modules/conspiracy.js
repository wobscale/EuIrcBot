module.exports.command = 'conspiracy';
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const groups = [
    'the government', 'the Jews', 'the Goys', 'lizard people', 'scientists', 'doctors',
    'big pharma', 'Monsanto', 'the gays', 'the FDA', 'the IRS', 'the illuminati', 'Muslims',
    'the Catholic Church', 'big oil', 'the EPA', 'Communists', 'Facists', 'Marxists',
    'China', 'North Korea', 'ISIS', 'wall street', 'the UN', 'the FBI', 'Russia',
    'aliens', 'the NRA', 'the Bilderberg Group', 'the NSA', 'the CIA', 'the Five Eyes',
    'vegans', 'the MPAA', 'Hollywood', 'the patriarchy', 'the FCC', 'the FDIC', 'Goldman Sachs',
    'Anonymous', 'academics', 'Baby Boomers', 'the UN', 'the Freemasons', 'the New World Order',
  ];

  const entities = [
    'Hillary Clinton', 'Obama', 'Hitler', 'Stalin', 'Putin', 'the Koch Brothers', 'Kim Jong-Un',
    'Henry Kissinger', 'George W Bush', 'Al Gore', 'Rupert Murdoch', 'Richard Nixon', 'JFK',
    'Chancellor Schrader', 'Jesus Christ', 'Larry Ellison',
  ];

  const objects = [
    'jet fuel', 'steel beams', 'bigfoot', 'vaccines', 'thinking about things', '"healthy living"',
    'DNC 2016', 'Bernie Sanders', 'chemtrails', 'asbestos', 'UFOs', 'nihilism',
    'WMDs', 'aliens', 'Noam Chomsky', 'artificial intelligence', 'nukes', 'IEDs',
    'RFID chips', 'the mark of the beast', 'Masonic Lodges', 'Obama\'s birth certificate',
    'renewable energy', 'postmodernism', 'the Denver International Airport', 'the Bermuda Triangle',
  ];

  const ailments = [
    'cancer', 'Zika', 'autism', 'infertility', 'AIDS', 'smallpox', 'Ebola', 'swine flu', 'superbacteria',
    'the common cold', 'alcoholism',
  ];

  const marginalized_groups = [
    'whites', 'blacks', 'homosexuals', 'transsexuals', 'children', 'refugees', 'native americans', 'women', 'vegans',
    'straight white males', 'journalists', 'the homeless', 'free software', 'hippies', 'grad students', 'millenials',
    'libertarians',
  ];

  const disasters = [
    '9/11', 'Hurricane Katrina', 'Bengazi', 'mandatory vaccinations', 'the Fukushima nuclear disaster', 'the Holocaust',
    'the Kennedy Assassination', 'earthquakes', 'the BP oil spill', 'the moon landing', 'the Columbine massacre',
    'the recession', 'the great depression', 'global warming', 'Roswell', 'Chernobyl', 'the Challenger disaster',
    'the Columbia disaster', 'Occupy Wall Street', 'Edward Snowden', 'Japanese internment camps', 'bitcoin', 'antibiotics',
    'the Manhattan Project', 'Pearl Harbor', 'the disappearance of Amelia Earhart', 'smallpox blankets',
  ];

  const inventions = [
    'diet soda', 'encryption', 'fracking', 'fluorinated water', 'GMOs', 'NPR', 'TV', 'processed foods',
    'pyramids', 'libraries', 'guns', 'monads', 'video games', 'pornography', 'tofurkey', 'homophobia',
    'Apollo 13', 'pansexuality', 'artificial intelligence', 'self-driving cars', 'copyright', 'software patents',
    'virtual reality', 'cigarettes', 'anime', 'wind farms', 'tinfoil hats', 'LSD', 'trolley problems',
  ];

  const motivations = [
    'cover up -object-',
    'cover up -disaster-',
    'distract from -group-',
    'distract from -group- after they caused -disaster-',
    'distract from -disaster-',
    'poison -group-',
    'eradicate -marginalizedgroup-',
    'give -marginalizedgroup- -ailment-',
    'give -marginalizedgroup- -ailment- in retribution for -disaster-',
    'control the masses',
    'control -marginalizedgroup-',
  ];

  const theories = [
    "-object- can't melt -object-",
    '-group- created -object- to -motivation-',
    '-disaster- was an inside job!',
    '-group- are secretly run by -entity-',
    '-group- was created to -motivation-',
    '-invention- was created to -motivation-',
    '-group- are a false front for -group-',
    '-entity- is single-handedly trying to -motivation-',
    '-group- are using -ailment- to -motivation-',
    '-disaster- was faked!',
    '-disaster- was faked by -entity-!',
    '-disaster- was faked by -group- to -motivation-',
  ];

  const keyword_to_options = {
    motivation: motivations,
    group: groups,
    object: objects,
    entity: entities,
    marginalizedgroup: marginalized_groups,
    disaster: disasters,
    ailment: ailments,
    invention: inventions,
  };

  let conspiracy = theories[Math.floor(Math.random() * theories.length)];

  let change_count;
  do {
    change_count = 0;
    Object.keys(keyword_to_options).forEach((key) => {
      while (conspiracy.indexOf(`-${key}-`) > -1) {
        const options = keyword_to_options[key];
        const option = options[Math.floor(Math.random() * options.length)];

        conspiracy = conspiracy.replace(`-${key}-`, option);
        change_count++;
      }
    });
  } while (change_count > 0);

  reply(`Conspiracy theory: ${conspiracy}`);
};

