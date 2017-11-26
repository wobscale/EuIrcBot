const urban = require('urban');

const elems = {
  ud: ['definition'],
  udexample: ['example'],
  urbandict: ['definition', 'example'],
};

const use = {
  ud: 'Define a term',
  udexample: 'See an example for a term',
  urbandict: 'See both the definition and an example for a term',
};

function usage(command, reply) {
  reply(`${command} ${use[command]}`);
  reply(`!${command} <term>`);
}

function getFirst(command, term, reply) {
  const result = urban(term);

  result.first((json) => {
    if (json) {
      elems[command].forEach((elem) => {
        reply.custom({ lines: 5, replaceNewlines: true, pmExtra: true }, `${elem}: ${json[elem]}`);
      });
    } else {
      reply(`No entry for ${term}`);
    }
  });
}

module.exports.commands = ['ud', 'urbandict', 'udexample'];
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw) {
  if (remainder.length == 0) {
    usage(command, reply);
  } else {
    getFirst(command, remainder, reply);
  }
};

