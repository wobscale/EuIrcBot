module.exports.command = "gamedev";
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var genres = [
    'survival', 'horror', 'augmented reality', 'virtual reality', 'strategy', 'action', 'fighting', '3D',
    'shooter', 'first person', 'role playing', 'survival horror', 'farming simulator', 'tycoon simulator',
    'MMO', 'sports', 'platformer', 'beat-em-up', 'adventure', 'stealth', 'text-based', 'visual novel', 
    'roguelike', 'sandbox', 'JRPG', 'life sim', 'dating sim', 'racing', 'real time strategy', 'MOBA', 
    'tower defense', 'card', 'party', 'logic', 'trivia', 'board', 'idle', 'Christian', 'educational'
  ];
  
  var combat_types = [
    'real-time', 'turn-based', 'card game', 'strategy', 'mini-game', 'reflex', 'random', 'idle', 'sci-fi',
    'fantasy', 'rock paper scissors', 'abstract', 'nonexistent', 'plentiful', 'Pokemon-esque'
  ];
  
  var templates = [
    '-genre- game with -combat_type- combat and -genre- elements',
    '-genre- game with -combat_type- combat and -combat_type- elements',
    '-genre- -genre- game with -combat_type- combat and -genre- elements',
    '-genre- -genre- game mixing -combat_type- and -combat_type- combat',
    '-combat_type- -genre- game with -genre- elements'
  ];

  var pitch = templates[Math.floor(Math.random() * templates.length)];
  
  while (pitch.indexOf('-genre-') > -1) {
  	var random_genre = genres[Math.floor(Math.random() * genres.length)];
  	pitch = pitch.replace('-genre-', random_genre);
  }
  
  while (pitch.indexOf('-combat_type-') > -1) {
  	var random_combat_type = combat_types[Math.floor(Math.random() * combat_types.length)];
  	pitch = pitch.replace('-combat_type-', random_combat_type);
  }
  
  reply('Game of the year: ' + pitch);
};
