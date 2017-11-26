
const request = require('request-promise');

exports.balancedParens = function balancedParens(string) {
  const length = string.length;
  let balance = 0;
  for (let i = 0; i < length; i++) {
    if (string[i] === '(') {
      balance++;
    } else if (string[i] === ')') {
      balance--;
      if (balance < 0) {
        return false;
      }
    }
  }
  return balance === 0;
};

exports.contains = function contains(substr, superstr) {
  return superstr.indexOf(substr) > -1;
};

function lookup(key) {
  return function (object) {
    return object[key];
  };
}

exports.lookup = lookup;

function orComp(fn0, fn1, fn2) {
  return function (x) {
    return fn0(x) || fn1(x) || fn2(x);
  };
}

exports.orComp = orComp;

exports.lookupFirst = function (key0, key1, key2) {
  return orComp(lookup(key0), lookup(key1), lookup(key2));
};

function addCookie(req, key, value) {
  const cookie = request.cookie(`${key}=${value}`);
  const jar = request.jar();
  jar.setCookie(cookie, req.uri.split('?')[0]);
  req.jar = jar;
  return req;
}

exports.buildRequest = function buildRequest(expression, session) {
  const urlEncoded = encodeURIComponent(expression);
  let request = {
    uri: `http://www.tryclj.com/eval.json?expr=${urlEncoded}`,
    method: 'GET',
    resolveWithFullResponse: true,
  };
  if (session) {
    request = addCookie(request, 'ring-session', session);
  }
  return request;
};

exports.fakePromise = function fakePromise(value) {
  return {
    then(fn) {
      const result = fn(value);
      if (!!result && !!result.then) {
        return result;
      }
      return fakePromise(result);
    },
  };
};
