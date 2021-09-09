const ud = require('urban-dictionary');

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
  ud.define(term).then((results) => {
    if (results.length === 0) {
      reply(`No results for ${term}`);
      return;
    }
    elems[command].forEach((elem) => {
      reply.custom({ lines: 5, replaceNewlines: true, pmExtra: true }, `${elem}: ${results[0][elem]}`);
    });
  }).catch((error) => {
    reply(`Error getting ${term}: ${error.message}`);
  });
}

module.exports.commands = ['ud', 'urbandict', 'udexample'];
module.exports.run = function (remainder, parts, reply, command) {
  if (remainder.length === 0) {
    usage(command, reply);
  } else {
    getFirst(command, remainder, reply);
  }
};
