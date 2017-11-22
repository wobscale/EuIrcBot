const http = require('http');
const async = require('async');

const randomImgurId = function () {
  const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += validChars[(Math.floor(Math.random() * validChars.length))];
  }
  return id;
};

const getRandomImage = function (cb) {
  const id = randomImgurId();
  http.get(`http://i.imgur.com/${id}.png`, (res) => {
    if (res.statusCode == 200) cb(null, id);
    else cb(`No image: ${res.statusCode}`);
  });
};


module.exports.commands = {
  imgur: {
    random(r, p, reply) {
      let num = parseInt(p[0]);
      if (num > 15) num = 15;
      if (num < 1 || isNaN(num)) num = 1;

      let count = 0;
      const images = [];
      async.doWhilst(
        (cb) => {
          getRandomImage((err, res) => {
            if (!err) {
              count++;
              images.push(res);
            }
            cb(null);
          });
        },
        () => count < num,
        (err) => {
          if (err) return reply(`Error: ${err}`);
          if (images.length == 1) return reply(`Image: http://i.imgur.com/${images[0]}.png`);
          reply(`Images: http://imgur.com/${images.join(',')}`);
        },
      );
    },
  },
};
