

var u = require("./utils");
var repl = require("./repl");

function shouldEval (text) {
    return u.contains("(", text) &&
        u.balancedParens(text);
}

module.exports.msg = function (text, from, reply, raw) {
    if (shouldEval(text)) {
        repl.evalClj(text).then(reply);
    }
}
