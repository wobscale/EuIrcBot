module.exports.command = 'startup';
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const services = [
    'Pandora', 'Foursquare', 'Facebook', 'Netflix', 'Gmail', 'LinkedIn', 'NASA',
    'Eclipse', 'Spotify', 'Paypal', 'Twitter', 'AI', 'SB', 'GitHub', 'Google Glass',
    'Maps', 'Quora', 'Groupon', 'RSS', 'Redis', 'MapReduce', 'the iPhone',
    'Weedmaps', 'SnapChat', 'drones', 'WordPress', 'Napster', 'Tumblr', 'AirBnB',
    'cloud storage', 'a jQuery plugin', 'Reddit', 'Cash4Gold', 'Flickr', 'dongs',
    'Wikipedia', 'eHarmony', 'Amazon', 'Adult Friend Finder', 'EC2', 'S3',
    '4chan', 'Blogger', 'Pinterest', 'the PS3', 'the XBOX', 'Craigslist', 'XHamster',
    'CNN', 'a new programming language', 'a webbrowser', 'ads', 'The Pirate Bay', 'Ebay',
    'Deviant Art', 'mail order bombs', 'crowdsourced retirement funding', 'Siri',
    'a personal assistant', 'robot replacements', 'fingerboxes', 'concealed weaponry',
    'an iPhone app', 'complaint management', 'easy blogging', 'a pyramid scheme', 'fleshlights',
    'Farmlogs', 'Red Nova Labs', 'Threat Stack', 'graduate school', 'suscd\'s birthday',
    'Google Keep', 'Hangouts', 'Oculus Rift', 'virtual reality', 'VR', 'augmented reality', 'AR',
    '2 monitors', '5 monitors', 'UPS', 'FedEx', 'the USPS', 'Docker', 'Go', 'Lisp', 'Slack',
  ];
  const markets = [
    'finance', 'music', 'movies', 'pictures', 'gifs', 'pirated content', 'education',
    'hairstyling', 'red wine', 'literature', 'adult dancers', 'food', 'math',
    'hard engineering problems', 'botany', 'drugs', 'network administration',
    'shopping', 'cougars', 'MILFs', 'good looking people', 'the army', 'interns',
    'whiskey', 'retirement planning', 'beer', 'traveling', 'funerals', 'dongs',
    'presentations', 'online food delivery', 'the homeless', 'managing exes',
    'small businesses', 'coffee', 'textbooks', 'politics', 'your mom', 'slacklining',
    'gay people', 'cats', 'dogs', 'Germans', 'Christians', 'Athiests',
    'redditors', 'guns', 'ladies', 'men', 'programmers', 'ninjas', 'pirates',
    'criminals', 'prisoners', 'autists', 'artists', 'emo teens', 'babies',
    'republicans', 'people like ek', 'Amazon employees', 'B movies', 'pornstars',
    'hipsters', 'barbarians', 'native americans', 'hackers', 'retired strippers',
    'people like reed', 'snipers', 'devoted Christians', 'atheists', 'cats',
    'the unemployed', 'the 1%', 'business purposes', 'amputees', 'panda lovers',
    'recipes', 'writers', 'dogs', 'birds', 'anime', 'the POTUS', 'sick horses',
    'girls that look like brigid', "people who can't read good", 'family photos',
    'suscd\'s birthday', 'academia', 'mail delivery', 'secure storage', 'security',
    'privacy', 'high frequency trading', 'investing', 'an awful idea', 'a better idea',
    'peer reviewed', 'penetration testing', '3D printing', 'smart housing', 'eggs',
  ];

  const startup_pitches = [
    '-service- for -market-',
    '-service- for -market-',
    '-service- for -market-',
    '-service- for -market-',
    '-service- for -market-',
    '-market- as a -service-',
    '-service- but -service-',
    '-market- but -market-',
    '-service- for -market-, but like -service-',
    '-service- for -market-, in the style of -service-',
    '-service- for -market-, marketed at -market-',
    '-service- to combine -market- with -market-',
    '-service- as a service',
    'a method for performing -service- using a computer',
    'an invention in which -service- is used for -market-',
  ];

  let pitch = startup_pitches[Math.floor(Math.random() * startup_pitches.length)];

  while (pitch.indexOf('-service-') > -1) {
  	const random_service = services[Math.floor(Math.random() * services.length)];
  	pitch = pitch.replace('-service-', random_service);
  }

  while (pitch.indexOf('-market-') > -1) {
  	const random_market = markets[Math.floor(Math.random() * markets.length)];
  	pitch = pitch.replace('-market-', random_market);
  }

  reply(`Random startup idea: ${pitch}`);
};

