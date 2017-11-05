/*
 * This module prints ActivityPub Note and Person objects based on a URL. Its
 * primary use is to print information about permalinks on Mastodon instances,
 * hence the module name, but could theoretically be used on any endpoint that
 * supports those ActivityPub object types.
 *
 * Because of the focus on Mastodon instances (on a sufficiently recent
 * version), assumptions are made about how to operate. This module is not
 * expected to be a fully-fledged ActivityPub client. Issues with handling URLs
 * on Mastodon 1.6.0 and later are considered bugs. Other issues will be
 * handled on a case-by-case basis.
 *
 * Mastodon instances can be on any hostname. Instance autodiscovery is
 * somewhat irresponsible as it would cause a request to be made every time a
 * URL is posted to a channel.
 *
 * Instances are thus discovered from other instances organically. A small list
 * of instances is included in default_instances.json, which is used in a
 * default configuration. When a toot is fetched, this bot also fetches
 * /api/v1/timelines/public and learns new instances from that.
 *
 * In case an instance isn't already known, users can share a toot URL with the
 * !masto command, which will force the bot to do an API lookup.
 *
 * Bot administrators can block hostnames from being used as instances by
 * adding them to the "blocked" key in this module's config.json.
 */

var Cacheman = require('cacheman')
  , contentType = require('content-type')
  , execSync = require('child_process').execSync
  , htmlToText_mod = require('html-to-text')
  , robotsParser = require('robots-parser')
  , robotsTxtCache = new Cacheman()
  , sprintf = require('extsprintf').sprintf
  , util = require('util')
  , url = require('url');

/* variables defined in module.exports.init */
var bot = null
  , log = null
  , moduleConfig = null
  , request = null;

function robotRequest(url, fn) {
  var userAgent = moduleConfig != null && moduleConfig.userAgent || 'EuIrcBot';
  var robotsTxtUrl = url.resolve(url, '/robots.txt');

  var handle = function (robots) {
    if (robots.isAllowed(url, userAgent)) {
      request(url, fn);
    } else {
      fn(Error(util.format('URL access disallowed by %s: %s', robotsTxtUrl, url)));
    }
  };

  robotsTxtCache.get(robotsTxtUrl, function (err, robots) {
    if (err) {
      fn(Error('robots.txt cache error: ' + err.message));
    } else {
      if (!robots) {
        request(robotsTxtUrl, function (err, response, body) {
          if (err) {
            fn(Error(util.format('failed to fetch %s: %s', robotsTxtUrl, err.message)));
          } else {
            robots = robotsParser(robotsTxtUrl, body);
            /* `User-agent: *` rules are generally overzealous. We're not a
             * search engine spider. */
            delete robots._rules['*'];
            /* Determine TTL for this robots.txt. Google says that requests are
             * "generally cached for up to one day" but that it may adjust that
             * based on max-age Cache-Control headers, which seems reasonable. */
            var ttl = 86400;
            if (response.headers['cache-control']) {
              var match = response.headers['cache-control'].match(/\bmax-age=([0-9]+)\b/);
              if (match) {
                /* Clamp this value to between (300, 604800) to guard against
                 * unreasonable configuration / bugs in this code. */
                ttl = Math.min(Math.max(parseInt(match[1], 10), 300), 604800);
              }
            }

            robotsTxtCache.set(robotsTxtUrl, robots, ttl, function (err) {
              if (err) {
                fn(Error('robots.txt cache error: ' + err.message));
              } else {
                handle(robots);
              }
            });
          }
        });
      } else {
        handle(robots);
      }
    }
  });
}

function defaultConfig() {
  return {'instances': require('./default_instances.json')};
}

function writeConfig() {
  bot.writeDataFile('config.json', JSON.stringify(moduleConfig), function(err) {
    if (err)
      log.error('error writing mastodon module data: ' + err);
  });
}

function checkHostname(hostname, fn) {
  if (moduleConfig.blocks && moduleConfig.blocks.includes(hostname)) {
    fn(false);
  } else {
    fn(moduleConfig.instances && moduleConfig.instances.includes(hostname));
  }
}

/*
 * fetchResource only attempts to fetch the URL given as a particular content
 * type. This is less than what a full ActivityPub-implementing client needs to
 * handle; following Link headers and <link> HTML tags of the correct content
 * types would also be required.
 */
function fetchResource(url, fn) {
  request({
    url: url,
    headers: { 'Accept': 'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/activity+json' },
  }, (error, response, body) => {
    if (error) {
      fn(error);
    } else if (response.statusCode != 200) {
      fn(new Error('response status code is ' + response.statusCode));
    } else if (!['application/ld+json', 'application/activity+json'].includes(
      contentType.parse(response.headers['content-type']).type
    )) {
      fn(new Error('resource is not an ActivityPub record'));
    } else {
      try {
        var record = JSON.parse(body);
        if (!['Note', 'Person'].includes(record.type)) {
          fn(new Error('record is not a Note or Person'));
        } else {
          fn(null, record);
        }
      } catch (e) {
        fn(e);
      }
    }
  });
}

function htmlToText(s) {
  return htmlToText_mod.fromString(s, {
    wordwrap: null,
    ignoreHref: true,
  });
}

function formatRecord(record, fn) {
  if (record.type == 'Note') {
    fetchResource(record.attributedTo, (error, userRecord) => {
      var str = '';
      if (error) {
        str += '(error getting user): ';
      } else {
        str += sprintf('%s (@%s): ', userRecord.name, userRecord.preferredUsername);
      }
      if (record.sensitive) {
        str += sprintf('[content warning] %s', record.summary);
      } else {
        str += htmlToText(record.content);
      }
      fn(str);
    });
  } else if (record.type == 'Person') {
    fn(sprintf('%s (@%s): %s',
      record.name,
      record.preferredUsername,
      htmlToText(record.summary),
    ));
  }
}

module.exports.commands = ['masto'];

module.exports.init = function(b) {
  bot = b;
  log = bot.log;

  bot.readDataFile('config.json', function(err, data) {
    if (err) {
      log.info('initializing mastodon module data');
      moduleConfig = defaultConfig();
    } else {
      try {
        moduleConfig = JSON.parse(data);
      } catch(ex) {
        moduleConfig = defaultConfig();
      }
    }
    writeConfig();
  });

  var userAgent = moduleConfig && moduleConfig.userAgent || 'EuIrcBot';
  try {
    var ver = require('../../package.json').version;
    userAgent += '/' + ver;
  } catch (ex) {}

  var userAgentUrl = (moduleConfig && moduleConfig.userAgent
    || 'https://github.com/euank/EuIrcBot/blob/{commitish}/modules/mastodon/info.md');
  if (userAgentUrl.includes('{commitish}')) {
    var commitish = 'master';
    try {
      commitish = execSync('git rev-parse HEAD', {'encoding': 'utf8'}).trim();
    } catch (ex) {}
    userAgentUrl = userAgentUrl.replace(/{commitish}/g, commitish);
  }
  userAgent += ' (+' + userAgentUrl + ')';

  request = require('request').defaults({
    headers: {'User-Agent': userAgent}
  });
};

/*
 * When a user calls "!masto [url]", both run and url get called. The first
 * thing we do in each of these methods is check the domain against
 * knownInstances; run only continues if the instance is unknown, and url only
 * continues if the instance is known.
 */

module.exports.run = function(remainder, parts, reply, command, from, to, text, raw) {
  u = url.parse(remainder);
  if (!(u.protocol && u.host)) { return; }
  checkHostname(u.host, (ok) => { if (!ok) {
    fetchResource(u, (error, record) => {
      if (error) {
        reply('error: ' + error.message);
      } else {
        formatRecord(record, (s) => reply.custom({ replaceNewlines: true }, s));
      }
    });
  }});
};

module.exports.url = function(u, reply) {
  u = url.parse(u);
  checkHostname(u.host, (ok) => { if (ok) {
    fetchResource(u, (error, record) => {
      if (!error) {
        formatRecord(record, (s) => reply.custom({ replaceNewlines: true }, s));
      }
    });
  }});
};
