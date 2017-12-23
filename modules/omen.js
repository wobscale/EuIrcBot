module.exports.command = 'omen';
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const targets = [
    'The stars', 'The owls', 'Your enemies', 'Your friends', 'The obelisks', 'The crystals',
    'The secrets', 'The crows', 'Your teeth', 'The curses', 'The eyes', 'The trees', 'The wind',
    'The men of Amazon', 'The caves', 'The oceans', 'Cryptocurrencies', 'Investments', 'Loved ones',
    'Your family', 'The mountaintops', 'Dark fogs', 'Weathered roads', 'Successes', 'Failures'
  ];
  const actions = [
    'do not know you', 'are not what they seem', 'cannot reach you', 'are closer than you think',
    'are gone when you look away', 'are ephemeral', "won't last forever", 'plot revenge',
    'hold secrets', 'hold grudges', 'are not lost... but waiting', 'are waiting patiently',
    'will surprise you', 'know your past', 'know your secrets', 'know your future', 'are here',
    'will betray you', 'will visit you soon'
  ];
  const intros = [
    'Prepare:', 'Repent:', 'Sleep well:', 'So look away:', 'Look quickly:', 'Remember:'
  ];
  const outros = [
    "they'll whisper you your fate", "they'll sing your final song", "they'll bring great luck",
    'they, too, have teeth', 'they lie in wait', 'they are watching', 'they can still see you',
    'they know your IP', 'they come ever faster', "they'll be here soon", 'the clock ticks on',
    'some things are inevitable', 'fate is imminent', "sometimes there's nothing you can do",
    "it's up to you", 'you deserve it all', "we don't always get what we deserve", 'you can do it'
  ];

  const omen_templates = [
    '-intros- -targets- -actions-.. -outros-.',
    '-targets- -actions-. -intros- -outros-.',
    '-targets-.. -outros-. -intros- they -actions-.',
    '-targets- -actions-. -targets- -actions-.'
  ];

  let omen = omen_templates[Math.floor(Math.random() * omen_templates.length)];

  while (omen.indexOf('-targets-') > -1) {
  	const selection = targets[Math.floor(Math.random() * targets.length)];
  	omen = omen.replace('-targets-', selection);
  }
  while (omen.indexOf('-actions-') > -1) {
  	const selection = actions[Math.floor(Math.random() * actions.length)];
  	omen = omen.replace('-actions-', selection);
  }
  while (omen.indexOf('-intros-') > -1) {
  	const selection = intros[Math.floor(Math.random() * intros.length)];
  	omen = omen.replace('-intros-', selection);
  }
  while (omen.indexOf('-outros-') > -1) {
  	const selection = outros[Math.floor(Math.random() * outros.length)];
  	omen = omen.replace('-outros-', selection);
  }

  reply(`${from}: ${omen}`);
};

