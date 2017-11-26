const request = require('request-promise');
const u = require('./utils');

let globalSession = null;

function saveSession(response) {
  try {
    const headers = response.headers;
    const cookie = headers['set-cookie'][0];
    const ringSession = cookie.split(';')[0].split('=')[1];
    globalSession = ringSession;
  } catch (e) {
    // console.error("problem grabbing cookie from response");
    // console.error("headers: ", headers, "cookie: ", cookie);
    // console.error("status: ", response.statusCode, "body: ", response.body);
  }
  return response;
}

exports.evalClj = function evalClj(expression) {
  if (expression === '(reset-session)') {
    globalSession = null;
    return u.fakePromise('Reset repl session');
  }
  const options = u.buildRequest(expression, globalSession);
  return request(options)
    .then(saveSession)
    .then(u.lookup('body'))
    .then(JSON.parse)
    .then(u.lookupFirst('result', 'message'));
};
