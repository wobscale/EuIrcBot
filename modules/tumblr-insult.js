module.exports.init = function(bot) {};

module.exports.commands = {
  tumblrant: function(x,y,z) {
    z(generateParagraph(x === 'true'));
  },
  tumblrinsult: function(x,y,z) {
    z(generateInsult(true, x === 'true'));
  }
};

$ = {
  each: function( object, callback, args ) {
    var name, i = 0, length = object.length;

    if ( args ) {
      if ( length === undefined ) {
        for ( name in object )
          if ( callback.apply( object[ name ], args ) === false )
            break;
      } else
        for ( ; i < length; )
      if ( callback.apply( object[ i++ ], args ) === false )
        break;

      // A special, fast, case for the most common use of each
    } else {
      if ( length === undefined ) {
        for ( name in object )
          if ( callback.call( object[ name ], name, object[ name ] ) === false )
            break;
      } else
        for ( var value = object[0];
             i < length && callback.call( value, i, value ) !== false; value = object[++i] ){}
    }

    return object;
  }
};


//https://raw.github.com/Lokaltog/tumblr-argument-generator/develop/app/assets/js/main.js
ARandom = function (a) {
  return a[Math.floor(Math.random() * a.length)];
};

StringrandomRepeat = function (str, len) {
  return str + (new Array(Math.floor(Math.random() * (len - 1)))).join(str);
};

var generateSentence,
    generateInsult,
    generateParagraph,
    replaceTerms,
    randomBoolean,
    tumblrizeText,
    tumblrTerm,
    tumblrDictionary = {
      description: [
        'damn',
        'fucking',
        'goddamn',
      ],
      insult: [
        'burn in hell',
        'check your {privilegedNoun} privilege',
        'die in a fire',
        'drop dead',
        'fuck off',
        'fuck you',
        'go drown in your own piss',
        'go play in traffic',
        'kill yourself',
        'light yourself on fire',
        'make love to yourself in a furnace',
        'please die',
        'rot in hell',
        'screw you',
        'shut the fuck up',
        'shut up',
      ],
      insultAdverb: [
        'deluded',
        'entitled',
        'fucking',
        'goddamn',
        'ignorant',
        'inconsiderate',
        'judgemental',
        'oppressive',
        'pathetic',
        'worthless',
      ],
      insultNoun: [
        'MRA',
        'asshole',
        'basement dweller',
        'bigot',
        'brogrammer',
        'creep',
        'dudebro',
        'fascist',
        'hitler',
        'lowlife',
        'nazi',
        'neckbeard',
        'oppressor',
        'pedophile',
        'piece of shit',
        'rape-apologist',
        'rapist',
        'redditor',
        'scum',
        'subhuman',
        'virgin',
      ],
      fullInsult: function () {
        return ARandom([
          tumblrTerm('insultAdverb') + ' ' + tumblrTerm('insultNoun'),
          tumblrTerm('insultNoun'),
        ]);
      },
      marginalizedNoun: [
        'activist', 'agender', 'appearance', 'asian', 'attractive',
        'bi', 'bigender', 'black', 'celestial', 'chubby', 'closet',
        'color', 'curvy', 'dandy', 'deathfat', 'demi', 'differently abled',
        'disabled', 'diversity', 'dysphoria', 'estrogen-affinity', 'ethnic',
        'ethnicity', 'fat love', 'fat', 'fatty', 'female',
        'genderfuck', 'genderless', 'body hair', 'height',
        'indigenous', 'intersectionality', 'intersexual', 'invisible', 'kin',
        'little person', 'marginalized', 'minority',
        'multigender', 'non-gender', 'non-white', 'obesity', 'otherkin', 'omnisexual',
        'pansexual', 'polygender', 'polyspecies', 'privilege', 'prosthetic', 'queer',
        'radfem', 'skinny', 'smallfat', 'stretchmark', 'thin',
        'third-gender', 'trans*', 'transethnic', 'transgender', 'transman',
        'transwoman', 'trigger', 'two-spirit', 'womyn', 'wymyn', 'saami', 'native american',
        'hijra', 'transnormative', 'LGBTQIA+',
        'cross-dresser', 'androphilia', 'gynephilia', 'PoC', 'WoC',
      ].concat((function () {
        var result = [],
        personalPrefixes = [
          'dandy',
          'demi',
          'gender',
        ],
        personalPostfixes = [
          'amorous',
          'femme',
          'fluid',
          'queer',
          'fuck',
        ],
        sexualPrefixes = [
          'a',
          'bi',
          'demi',
          'multi',
          'non',
          'omni',
          'pan',
          'para',
          'poly',
        ],
        sexualPostfixes = [
          'gender',
          'sexual',
          'romantic',
          'queer',
        ]

        $.each(personalPrefixes, function (i, pre) {
          $.each(personalPostfixes, function (i, post) {
            result.push(pre + post)
          })
        })
        $.each(sexualPrefixes, function (i, pre) {
          $.each(sexualPostfixes, function (i, post) {
            result.push(pre + post)
          })
        })

        return result
      })()),
      marginalizedAdverb: [
        'antediluvian',
        'attacking',
        'chauvinistic',
        'close-minded',
        'dehumanizing',
        'denying',
        'discriminating',
        'hypersexualizing',
        'ignoring',
        'intolerant',
        'misogynistic',
        'nphobic',
        'objectifying',
        'oppressive',
        'patriarchal',
        'phobic',
        'racist',
        'rape-culture-supporting',
        'sexist',
        'sexualizing',
        'shaming',
      ],
      marginalizedIsm: [
        'fatist',
        'feminist',
        'freeganist',
        'lesbianist',
      ],
      privilegedNoun: [
        'able-body',
        'binary',
        'cis',
        'cisgender',
        'cishet',
        'hetero',
        'male',
        'middle-class',
        'smallfat',
        'thin',
        'white',
      ],
      privilegedAdverb: [
        'normative',
        'overprivileged',
        'privileged',
      ],
      privilegedIsm: [
        'ableist',
        'ageist',
        'anti-feminist',
        'chauvinist',
        'classist',
        'kyriarchist',
        'misogynist',
        'nazi',
        'patriarchist',
        'sexist',
        'transmisogynist',
      ],
      awesomeStuff: [
        'female rights',
        'female superiority',
        'gender abolition',
      ],
      terribleStuff: [
        'gender roles',
        'institutionalized racism',
        'internalized misogynism',
        'internalized patriarchy',
        'male domination',
        'patriarchal beauty standards',
        'rape culture',
      ],
      verb: [
        ['abuse', 'abusing', 'abuse'],
        ['attack', 'attacking', 'attacking'],
        ['dehumanize', 'dehumanizing', 'dehumanization'],
        ['deny', 'denying', 'denial'],
        ['discriminate', 'discriminating', 'discrimination'],
        ['hypersexualize', 'hypersexualizing', 'hypersexualization'],
        ['ignore', 'ignoring', 'ignoring'],
        ['marginalize', 'marginalizing', 'marginalization'],
        ['objectify', 'objectifying', 'objectification'],
        ['oppress', 'oppressing', 'oppression'],
        ['sexualize', 'sexualizing', 'sexualization'],
        ['shame', 'shaming', 'shaming'],
      ],
      sentence: [
        { forms: [0], format: 'why the fuck do you feel the need to {verb} {marginalizedNoun}-{personality}', type: '?', },
        { forms: [1], format: 'stop fucking {verb} {marginalizedNoun}-{personality}', type: '!', },
        { forms: [1], format: 'you are a {marginalizedNoun}-{verb} {fullInsult}', type: '!', },
        { forms: [1], format: 'you should stop fucking {verb} {marginalizedNoun}-{personality}', type: '!', },
        { forms: [1], format: 'stop {verb} {marginalizedNoun}-{personality}', type: '!', },
        { forms: [2], format: 'your {verb} of {marginalizedNoun}-{personality} is problematic', type: '!', },
      ],
      subject: [
        'they',
        'xe',
        'ze',
        'zhe',
        'zie',
      ],
      intro: [
        '[TW: rant]',
        'just a friendly reminder:',
        'no. just. no.',
        'oh. my. god.',
        'this. is. NOT. okay.',
        'wow. just. wow.',
      ],
      statement: [
        'die in a fire',
        'fuck off',
        'fuck your {description} {terribleStuff}',
        'fucking address me as "{subject}"',
        'i hope you fucking die',
        'it\'s not my job to educate you',
        'leave {marginalizedNoun}-{personality} the fuck alone',
        'oh my god',
        'people like you deserve to die',
        'stop offending me',
        'stop tone policing me',
        'what the fuck do you have against {awesomeStuff}',
        'what the fuck has {subject} ever done to you',
        'why the FUCK should i respect your {description} opinion',
        'you are perpetuating {terribleStuff}',
        'you are the worst person alive',
        'you are triggering me',
        'you are worse than hitler',
        'you make me sick',
        'you should be ashamed of yourself',
        'your {terribleStuff} keeps me from having any {description} rights',
      ],
      emoji: [
        '(◕﹏◕✿)',
        '（　｀ー´）',
        '(•﹏•)',
        '└(｀0´)┘',
        'ᕙ(⇀‸↼‶)ᕗ',
        'ᕦ(ò_óˇ)ᕤ',
        '(⋋▂⋌)',
        '(¬_¬)',
        '٩(×̯×)۶',
      ],
      conclusion: [
        'in conclusion:',
        'tl;dr',
        'to summarize:',
      ],
      personality: (function () {
        var result = [],
        prefixes = [
          'aligned',
          'identifying',
          'type',
          'oppressed',
          'marginalized',
        ],
        postfixes = [
          'individuals',
          'people',
          'personalities',
        ]

        $.each(prefixes, function (i, pre) {
          $.each(postfixes, function (i, post) {
            result.push(pre + ' ' + post)
          })
        })

        return result
      })(),
    }

    replaceTerms = function (text) {
      return text.replace(/\{([a-z]+)\}/gi, function (m, p1) {
        return tumblrTerm(p1)
      })
    }

    tumblrizeText = function (text, uppercase) {
      var wrap

      // Randomly add out-of-place commas
      text = text.replace(/\b /g, function () {
        return StringrandomRepeat(ARandom(Math.random() > 0.05 ? ' ' : [',', '.']), 4);
      })

      // Randomly add tildes and asterisks around text
      if (Math.random() > 0.8) {
        wrap = StringrandomRepeat('~', 5);
        if (Math.random() > 0.3) {
          wrap += '*'
        }
        text = wrap + text + wrap.split('').reverse().join('')
      }

      // Convert you/you're, etc
      text = text.replace(/you're/g, 'ur')
      text = text.replace(/you/g, 'u')
      text = text.replace(/people/g, 'ppl')
      text = text.replace(/please/g, 'plz')
      text = text.replace(/e([dr])\b/g, function (m, p1) {
        return (Math.random() > 0.4 ? 'e' + p1 : p1)
      })

      if (uppercase) {
        text = text.toUpperCase()
      }

      // Randomly lowercase first characters
      text = text.replace(/^(\w)/g, function (m, p1) {
        return Math.random() > 0.3 ? p1 : p1.toLowerCase()
      })

      // Add emoji faces
      if (Math.random() > 0.8) {
        text += ' ' + tumblrTerm('emoji')
      }

      return text
    }

    tumblrTerm = function (type) {
      var ret = tumblrDictionary[type]
      if (typeof ret === 'undefined') {
        console.log('Unknown term: ' + type)
        return '[undefined]'
      }
      if (typeof ret === 'function') {
        return ret()
      }
      return ARandom(ret);
    }

    randomBoolean = function () {
      return Math.round(Math.random()) === 1
    }

    generateSentence = function () {
      var sentence = tumblrTerm('sentence'),
      verb = tumblrTerm('verb')

      return sentence.format.replace(/{verb}/gi, verb[ARandom(sentence.forms)]) + (randomBoolean() ? ' you ' + tumblrTerm('fullInsult') : '') + StringrandomRepeat(sentence.type, 10);
    }

    generateInsult = function (initial, tumblrize) {
      var insult = ''

      if (initial) {
        insult += tumblrTerm('insult')
        insult += ', you '

        if (Math.random() > 0.3) {
          insult += tumblrTerm('insultAdverb') + ' '
        }
        if (Math.random() > 0.3) {
          insult += ARandom([tumblrTerm('marginalizedIsm'), tumblrTerm('marginalizedNoun')]) + '-' + tumblrTerm('marginalizedAdverb') + ', '
        }
      }
      else {
        insult += 'you '
      }

      insult += tumblrTerm('privilegedNoun') + '-' + tumblrTerm('privilegedAdverb') + ' '
      insult += ARandom([tumblrTerm('insultNoun'), tumblrTerm('privilegedIsm')]) + ' '

      insult = replaceTerms(insult)

      if (tumblrize) {
        insult = tumblrizeText(insult)
      }

      return insult.trim()
    }

    generateParagraph = function (tumblrize) {
      var paragraph = [],
      length = 3 + Math.random() * 7,
      sentence, i

      for (i = 0, sentence = ''; i < length; i += 1) {
        if (i === 0) {
          if (Math.random() > 0.3) {
            sentence += tumblrTerm('intro') + ' '
          }

          sentence += generateInsult(true) + StringrandomRepeat('!', 10);
        }
        else {
          sentence = ARandom([
            generateInsult(false) + StringrandomRepeat('!', 10),
            generateSentence(),
            tumblrTerm('statement') + (randomBoolean() ? ' you ' + tumblrTerm('fullInsult') : '') + StringrandomRepeat('!', 10)
          ]).trim()
        }

        sentence = replaceTerms(sentence)

        // Randomly make stuff literal
        sentence = sentence.replace(/you are/g, function () {
          return (Math.random() > 0.2 ? 'you\'re literally' : 'you\'re')
        })

        if (tumblrize) {
          sentence = tumblrizeText(sentence, randomBoolean())
        }
        else if (randomBoolean()) {
          // Randomly uppercase sentences
          sentence = sentence.toUpperCase()
        }

        paragraph.push(sentence)
      }

      paragraph = paragraph.join(' ') + StringrandomRepeat('!', 10);

      if (randomBoolean()) {
        paragraph += ' ' + tumblrTerm('conclusion') + ' ' + replaceTerms(tumblrTerm('insult') + (randomBoolean() ? ' you ' + tumblrTerm('fullInsult') : '')).toUpperCase() + StringrandomRepeat('!', 10)
      }

      return paragraph.trim()
    }

   // $(document).ready(function () {
   //   $('#argument')
   //   .removeClass('loading')
   //   .text(generateInsult(true, $('#tumblrize-grammar').prop('checked')).toUpperCase())

   //   $('.controls button.generate-insult').click(function () {
   //     $('#argument').text(generateInsult(true, $('#tumblrize-grammar').prop('checked')).toUpperCase())
   //   })
   //   $('.controls button.generate-rant').click(function () {
   //     $('#argument').text(generateParagraph($('#tumblrize-grammar').prop('checked')))
   //   })
   // })
