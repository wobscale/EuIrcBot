
exports.command = "unshorten";

exports.run = function(r, p, reply)
{
     var unshortener = require('unshortener');

     // you can pass in a url object or string
     unshortener.expand(p[0],
                        function (err, url) {
                            reply( url.href );
                        });
}
