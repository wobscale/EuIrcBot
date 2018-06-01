const request = require('request');

const use = {
  unshorten: 'unshorten url shortenings',
};

function unshorten(link, reply) {
  request(link, (error, response) => {
    if (!error && response.statusCode === 200) {
      reply(`${response.request.uri.href}`);
    } else {
      reply(`${link}: redirect fails`);
    }
  });
}


function usage(command, reply) {
  reply(`${command} unshorten url shortenings\n${use[command]}\n!${command} <link>`);
}

module.exports.commands = ['unshorten'];
module.exports.run = function (remainder, parts, reply, command) {
  if (remainder.length === 0) {
    usage(command, reply);
  } else {
    unshorten(remainder, reply);
  }
};
