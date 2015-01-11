var request = require("request-promise");
var u = require("./utils");

var globalSession = null;

function saveSession (response) {
    try {
        var headers = response.headers;
        var cookie = headers["set-cookie"][0]
        var ringSession = cookie.split(";")[0].split("=")[1];
        globalSession = ringSession;
    } catch (e) {
        // console.error("problem grabbing cookie from response");
        // console.error("headers: ", headers, "cookie: ", cookie);
        // console.error("status: ", response.statusCode, "body: ", response.body);
    }
    return response;
}

exports.evalClj = function evalClj (expression) {
    if (expression === "(reset-session)") {
        globalSession = null;
        return u.fakePromise("Reset repl session");
    } else {
        var options = u.buildRequest(expression, globalSession);
        return request(options).
            then(saveSession).
            then(u.lookup("body")).
            then(JSON.parse).
            then(u.lookupFirst("result", "message"));
    }
}
