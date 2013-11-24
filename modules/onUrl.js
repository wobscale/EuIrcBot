var bot;
module.exports.init = function(b) {
  bot = b;
}

var urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g;

module.exports.msg = function(text, from, reply, raw) {
  var re;
  /* Avoid dupe urls in one line unless they really want it */
  var thisLinesUrls = [];
  while(re = urlRegex.exec(text)) {
    var url = re[0];
    if(thisLinesUrls.indexOf(url) >= 0) {
      bot.callModuleFn('dupeurl', [url, reply, text, from, raw]);
    } else {
      bot.callModuleFn('url', [url, reply, text, from, raw]);
    }
    thisLinesUrls.push(url);
  }
}

module.exports.url = function(url, reply, text) {
  // sample url function
}
