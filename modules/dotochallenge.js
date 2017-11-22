module.exports.command = 'dotochallenge';
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  const heroes = [
    'Razor', 'Rubick', 'Phantom Lancer', 'Legion Commander', 'Brewmaster', 'Outworld Devourer', 'Sniper', 'Lina', 'Sven', 'Visage',
    'Undying', 'Tiny', 'Tidehunter', 'Puck', 'Ursa', 'Magnus', 'Earthshaker', 'Windrunner', 'Techies', 'Crystal Maiden', 'Batrider',
    'Riki', 'Invoker', 'Venomancer', 'Timbersaw', 'Wraithking', 'Anti Mage', 'Ancient Apparition', 'Troll Warlord', 'Lich', 'Enchantress',
    'Bristleback', 'Pudge', 'Faceless Void', 'Tinker', 'Mirana', 'Bounty Hunter', 'Treant Protector', 'Gyrocopter', 'Slardar',
    'Lifestealer', 'Jakiro', 'Terrorblade', 'Dazzle', 'Chaos Kinght', 'Abaddon', 'Shadow Demon', 'Axe', 'Zeus', 'Alchemist', 'Elder Titan',
    'Pugna', 'Vengeful Spirit', 'Broodmother', 'Sand King', 'Lion', 'Witch Doctor', 'Ember Spirit', 'Clockwerk', 'Phantom Assassin',
    'Warlock', 'Chen', 'Keeper of the Light', 'Beastmaster', 'Centaur Warruner', 'Naga Siren', 'Kunkka', 'Phoenix', 'Silencer',
    'Morphling', 'Slark', 'Meepo', 'Shadow Shaman', 'Templar Assassin', 'Juggernaut', 'Natures Prophet', 'Necrolyte', 'Earth Spirit',
    'Doom', 'Shadow Fiend', 'Omniknight', 'Skywrath Mage', 'Weaver', 'Io', 'Medusa', 'Nightstalker', 'Ogre Magi', 'Tusk', 'Spectre',
    'Nyx Assassin', 'Drow Ranger', 'Clinkz', 'Disruptor', 'Bane', 'Enigma', 'Dragon Knight', 'Viper', 'Queen of Pain', 'Luna', 'Huskar',
    'Death Prophet', 'Storm Spirit', 'Spirit Breaker', 'Dark Seer', 'Bloodseeker', 'Lone Druid', 'Lycan', 'Leshrac', 'Underlord',
  ];
  const hero_types = [
    'nuker', 'farmer', 'jungler', 'carry', 'support', 'semi-support', 'semi-carry', 'disabler', 'initiator', 'pusher', 'roamer', 'ganker',
  ];
  const items = [
    'Armlet', 'Assault Cuirass', 'Skull Basher', 'Battle Fury', 'Black King Bar', 'Blade Mail',
    'Blink Dagger', 'Bloodstone',
    'Butterfly',
    "Eul's Scepter of Divinity", 'Dagon', 'Demon Edge', 'Desolator', 'Diffusal Blade',
    'Eaglesong', 'Ethereal Blade', 'Force Staff',
    'Daedalus', 'Hand of Midas', 'Heart of Tarrasque',
    'Hood of Defiance', 'Hyperstone', 'Shadow Blade', 'Crystalys',
    "Linken's Sphere", 'Maelstrom', 'Manta Style', 'Mask of Madness', 'Mekansm',
    'Mjollnir', 'Monkey King Bar', 'Necronomicon',
    'Orchid Malevolence', 'Pipe of Insight',
    'Radiance',
    'Divine Rapier', 'Refresher Orb', 'Sacred Relic',
    'Sange and Yasha', 'Satanic', 'Scythe of Vyse', "Shiva's Guard",
    'Eye of Skadi',
    'Talisman of Evasion', 'Boots of Travel', "Aghanim's Scepter",
    'Vanguard', "Vladmir's Offering",
    'Arcane Boots', 'Drum of Endurance', 'Medallion of Courage', 'Veil of Discord',
  ];

  const challenges = [
    'build -hero- as a -hero_type-',
    'build -item- -hero-',
    'build -item- -hero_type- -hero-',
    'rush -item- on -hero-',
    'rush -item- on a -hero_type-',
    'build -item- and -item- on -hero-',
    'build -item- into -item- on -hero-',
    "don't die a single time with -hero-",
    '6-slot -hero- with -item-, -item-, -item-, -item-, -item-, and boots',
    'build -item- and -item- on a -hero_type-',
    'build -hero- with 3 -item-s',
    'build -item-, -item-, and -item- on -hero-',
  ];

  let challenge = challenges[Math.floor(Math.random() * challenges.length)];

  // Replace heroes
  while (challenge.indexOf('-hero-') > -1) {
    challenge = challenge.replace('-hero-', heroes[Math.floor(Math.random() * heroes.length)]);
  }

  // Replace hero types
  while (challenge.indexOf('-hero_type-') > -1) {
    challenge = challenge.replace('-hero_type-', hero_types[Math.floor(Math.random() * hero_types.length)]);
  }

  // Replace items
  while (challenge.indexOf('-item-') > -1) {
    challenge = challenge.replace('-item-', items[Math.floor(Math.random() * items.length)]);
  }

  reply(`${from}: ${challenge}`);
};

