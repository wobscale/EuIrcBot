const http = require('http');

const url = 'http://dicks-api.herokuapp.com/dicks/';

function getDicks(n, reply) {
  http.get(url + n, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        let num = 0;
        json.dicks.every((dick) => {
          reply(dick);
          num++;
          if (num > 16) {
            reply('http://i.imgur.com/WoouIW3.gif');
            return false;
          }
          return true;
        });
      } catch (e) {
      }
    });
  });
}

function dicks(r, p, reply) {
  if (p.length > 0) {
    getDicks(p[0], reply);
  } else {
    getDicks(1, reply);
  }
}

module.exports.commands = {
  dicks,
  dick: dicks,
  dongs: dicks,
  dong: dicks,
};
