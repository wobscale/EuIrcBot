module.exports.command = "startup";
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var services = [
    'Pandora', 'Foursquare', 'Facebook', 'Netflix', 'Gmail', 'LinkedIn', 'NASA',
    'Eclipse', 'Spotify', 'Paypal', 'Twitter', 'AI', 'SB', 'GitHub', 'Google Glass',
    'Maps', 'Quora', 'Groupon', 'RSS', 'Redis', 'MapReduce', 'the iPhone',
    'Weedmaps', 'SnapChat', 'drones', 'WordPress', 'Napster', 'Tumblr', 'AirBnB',
    'cloud storage', 'a jQuery plugin', 'Reddit', 'Cash4Gold', 'Flickr', 'dongs',
    'Wikipedia', 'eHarmony', 'Amazon', 'Adult Friend Finder', 'EC2', 'S3',
    '4chan', 'Blogger', 'Pinterest', 'The PS3', 'The XBOX', 'Craigslist', 'XHamster',
    'CNN', 'A new Programming language', 'A Webbrowser', 'Ads', 'The Pirate Bay', 'Ebay',
    'Deviant Art', 'Mail order bombs', 'Crowdsourced retirement funding', 'Siri',
    'A personal assistant', 'Robot replacements', 'Fingerboxes', 'Concealed weaponry',
    'An iPhone app', 'Complaint management', 'Easy blogging', 'A pyramid scheme', 'Fleshlights'
  ];
  var markets = [
    'finance', 'music', 'movies', 'pictures', 'gifs', 'pirated content', 'education',
    'hairstyling', 'red wine', 'literature', 'adult dancers', 'food', 'math',
    'hard engineering problems', 'botany', 'drugs', 'network administration',
    'shopping', 'cougars', 'MILFs', 'good looking people', 'the army', 'interns',
    'whiskey', 'retirement planning', 'beer', 'traveling', 'funerals', 'dongs',
    'presentations', 'online food delivery', 'the homeless', 'managing exes',
    'small businesses', 'coffee', 'textbooks', 'politics', 'your mom',
    'gay people', 'cats', 'dogs', 'Germans', 'Christians', 'Athiests',
    'redditors', 'guns', 'ladies', 'men', 'programmers', 'ninjas', 'pirates',
    'criminals', 'prisoners', 'autists', 'artists', 'emo teens', 'babies',
    'republicans', 'people like ek', 'Amazon employees', 'B movies', 'pornstars',
    'hipsters', 'barbarians', 'native americans', 'hackers', 'retired strippers',
    'people like reed', 'snipers', 'devoted Christians', 'atheists', 'cats',
    'the unemployed', 'the 1%', 'business purposes', 'amputees', 'panda lovers',
    'recipes', 'writers', 'dogs', 'birds', 'anime', 'the POTUS', 'sick horses',
    'girls that look like brigid', "people who can't read good", 'family photos'
  ];

	var prefixless_markets = [
		'as a service'
	];

	var market_idx = Math.floor(Math.random() * (markets.length + prefixless_markets.length));
  var chosen_service = services[Math.floor(Math.random() * services.length)],
      chosen_market  = (markets.concat(prefixless_markets))[market_idx];

  reply('Random startup idea: ' + chosen_service + (market_idx < markets.length? ' for ' : ' ') + chosen_market);
};

