const vimeo = require('vimeo')();

const vimeoRegex = /vimeo\.com\/(\d+)/;

function formatSecs(secs) {
  sec_numb = secs;
  let hours = Math.floor(sec_numb / 3600);
  let minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
  let seconds = sec_numb - (hours * 3600) - (minutes * 60);
  if (hours < 10) { hours = `0${hours}`; }
  if (minutes < 10) { minutes = `0${minutes}`; }
  if (seconds < 10) { seconds = `0${seconds}`; }
  const time = `${hours}:${minutes}:${seconds}`;
  return time;
}

module.exports.url = function (url, reply) {
  let m;
  if ((m = vimeoRegex.exec(url))) {
    const id = m[1];
    vimeo.video(id, (err, res) => {
      if (err) return console.log(err);

      if (res.length < 1) return;
      res = res[0];

      reply(`${res.title} - ${formatSecs(res.duration)} - ${res.stats_number_of_plays} plays`);
    });
  }
};
