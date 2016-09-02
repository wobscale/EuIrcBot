module.exports.command = "dotochallenge";
module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {

  var heroes = [
    'Razor', 'Rubick', 'Phantom Lancer', 'Legion Commander', 'Brewmaster', 'Outworld Devourer', 'Sniper', 'Lina', 'Sven', 'Visage',
    'Undying', 'Tiny', 'Tidehunter', 'Puck', 'Ursa', 'Magnus', 'Earthshaker', 'Windrunner', 'Techies', 'Crystal Maiden', 'Batrider',
    'Riki', 'Invoker', 'Venomancer', 'Timbersaw', 'Wraithking', 'Anti Mage', 'Ancient Apparition', 'Troll Warlord', 'Lich', 'Enchantress',
    'Bristleback', 'Pudge', 'Faceless Void', 'Tinker', 'Mirana', 'Bounty Hunter', 'Treant Protector', 'Gyrocopter', 'Slardar',
    'Lifestealer', 'Jakiro', 'Terrorblade', 'Dazzle', 'Chaos Kinght', 'Abaddon', 'Shadow Demon', 'Axe', 'Zeus', 'Alchemist', 'Elder Titan',
    'Pugna', 'Vengeful Spirit', 'Broodmother', 'Sand King', 'Lion', 'Witch Doctor', 'Ember Spirit', 'Clockwerk', 'Phantom Assassin',
    'Warlock', 'Chen', 'Keeper of the Light', 'Beastmaster', 'Centaur Warruner', 'Naga Siren', 'Kunkka', 'Phoenix', 'Silencer',
    'Morphling', 'Slark', 'Meepo', 'Shadow Shaman', 'Templar Assassin', 'Juggernaut', 'Natures Prophet', 'Necrolyte', 'Earth Spirit',
    'Doom', 'Shadow Fiend', 'Omniknight', 'Skywrath Mage', 'Weaver', 'Wisp', 'Medusa', 'Nightstalker', 'Ogre Magi', 'Tusk', 'Spectre',
    'Nyx Assassin', 'Drow Ranger', 'Clinkz', 'Disruptor', 'Bane', 'Enigma', 'Dragon Knight', 'Viper', 'Queen of Pain', 'Luna', 'Huskar',
    'Death Prophet', 'Storm Spirit', 'Spirit Breaker', 'Dark Seer', 'Bloodseeker', 'Lone Druid', 'Lycan', 'Leshrac', 'Underlord'
  ];
  var hero_types = [
    'nuker', 'farmer', 'jungler', 'carry', 'support', 'semi-support', 'semi-carry', 'disabler', 'initiator', 'pusher', 'roamer', 'ganker'
  ];
  var items = [
    "Arcane Ring", "Armlet", "Assault Cuirass", "Skull Basher", "Belt of Strength", "Battle Fury", "Black King Bar", "Blade Mail",
    "Blades of Attack", "Blade of Alacrity", "Blink Dagger", "Bloodstone", "Boots of Speed", "Boots of Elvenskin", "Bottle", "Bracer",
    "Iron Branch", "Broadsword", "Buckler", "Butterfly", "Chainmail", "Circlet", "Clarity", "Claymore", "Cloak", "Animal Courier",
    "Flying Courier", "Eul's Scepter of Divinity", "Dagon", "Demon Edge", "Desolator", "Diffusal Blade", "Diffusal Blade",
    "Dust of Appearance", "Eaglesong", "Energy Booster", "Ethereal Blade", "Healing Salve", "Force Staff", "Gauntlets of Strength",
    "Gem of True Sight", "Ghost Scepter", "Gloves of Haste", "Daedalus", "Hand of Midas", "Headdress", "Heart of Tarrasque",
    "Helm of Iron Will", "Helm of the Dominator", "Hood of Defiance", "Hyperstone", "Shadow Blade", "Javelin", "Crystalys", "Morbid Mask",
    "Linken's Sphere", "Maelstrom", "Magic Stick", "Magic Wand", "Manta Style", "Mantle of Intelligence", "Mask of Madness", "Mekansm",
    "Mithril Hammer", "Mjollnir", "Monkey King Bar", "Mystic Staff", "Necronomicon", "Necronomicon", "Necronomicon", "Null Talisman",
    "Oblivion Staff", "Ogre Club", "Orchid Malevolence", "Perseverance", "Phase Boots", "Pipe of Insight", "Platemail", "Point Booster",
    "Poor Man's Shield", "Power Treads", "Quarterstaff", "Quelling Blade", "Radiance",
    "Divine Rapier", "Reaver", "Refresher Orb", "Aegis of the Immortal", "Cheese", "Sacred Relic", "Ring of Basilius", "Ring of Health",
    "Ring of Protection", "Ring of Regen", "Robe of the Magi", "Sange", "Sange and Yasha", "Satanic", "Scythe of Vyse", "Shiva's Guard",
    "Eye of Skadi", "Slippers of Agility", "Sage's Mask", "Soul Booster", "Soul Ring", "Staff of Wizardry", "Stout Shield",
    "Talisman of Evasion", "Tango", "Town Portal Scroll", "Boots of Travel", "Ultimate Orb", "Aghanim's Scepter", "Urn of Shadows",
    "Urn of Shadows Recipe", "Vanguard", "Vitality Booster", "Vladmir's Offering", "Void Stone", "Observer Ward", "Sentry Ward",
    "Wraith Band", "Yasha", "Arcane Boots", "Orb of Venom", "Drum of Endurance", "Medallion of Courage", "Smoke of Deceit", "Veil of Discord"
  ];

  var challenges = [
    'build -hero- as a -hero_type-',
    'build -item- -hero-',
    'build -item- -hero_type- -hero-',
    'rush -item- on -hero-',
    'rush -item- on a -hero_type-',
    'build -item- and -item- on -hero-',
    "don't die a single time with -hero-",
    '6-slot -hero- with -item-, -item-, -item-, -item-, -item-, and boots',
    'build -item- and -item- on a -hero_type-'
  ];

  var challenge = challenges[Math.floor(Math.random() * challenges.length)];

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

  reply(from + ': ' + challenge);
};

