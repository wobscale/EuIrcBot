const vimeo = require('vimeo')();

const vimeoRegex = /vimeo\.com\/(\d+)/;

function formatSecs(secs) {
  const sec_numb = secs;
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
  const m = vimeoRegex.exec(url);
  if (m) {
    const id = m[1];
    vimeo.video(id, (err, res) => {
      if (err) {
        this.log.error(err, 'unable to get vimeo video info');
        return;
      }

      if (res.length < 1) return;
      const firstVid = res[0];

      reply(`${firstVid.title} - ${formatSecs(firstVid.duration)} - ${firstVid.stats_number_of_plays} plays`);
    });
  }
};
