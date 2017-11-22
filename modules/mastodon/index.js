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

const Cacheman = require('cacheman');
const contentType = require('content-type');
const execSync = require('child_process').execSync;
const htmlToTextMod = require('html-to-text');
const robotsParser = require('robots-parser');
const util = require('util');
const urlMod = require('url');

const robotsTxtCache = new Cacheman();

/* variables defined in module.exports.init */
let bot = null;
let log = null;
let moduleConfig = null;
let request = null;

function robotRequest(options, fn) {
  const url = options.url;
  const userAgent = moduleConfig != null ? moduleConfig.userAgent : 'EuIrcBot';
  const robotsTxtUrl = urlMod.resolve(url, '/robots.txt');

  function handle(robotsTxt) {
    const robots = robotsParser(robotsTxtUrl, robotsTxt);
    /* `User-agent: *` rules are generally overzealous. We're not a
     * search engine spider. */
    delete robots._rules['*']; // eslint-disable-line no-underscore-dangle

    if (robots.isAllowed(url, userAgent)) {
      request(options, fn);
    } else {
      fn(new Error(util.format('URL access disallowed by %s: %s', robotsTxtUrl, url)));
    }
  }

  robotsTxtCache.get(robotsTxtUrl, (err, robotsTxt) => {
    if (err) { fn(new Error(`robots.txt cache error: ${err.message}`)); return; }
    if (robotsTxt) { handle(robotsTxt); return; }

    request(robotsTxtUrl, (err, response, robotsTxt) => { // eslint-disable-line no-shadow
      if (err) { fn(new Error(util.format('failed to fetch %s: %s', robotsTxtUrl, err.message))); return; }

      /* Determine TTL for this robots.txt. Google says that requests are
       * "generally cached for up to one day" but that it may adjust that
       * based on max-age Cache-Control headers, which seems reasonable. */
      let ttl = 86400;
      if (response.headers['cache-control']) {
        const match = response.headers['cache-control'].match(/\bmax-age=([0-9]+)\b/);
        if (match) {
          /* Clamp this value to between (300, 604800) to guard against
           * unreasonable configuration / bugs in this code. */
          ttl = Math.min(Math.max(parseInt(match[1], 10), 300), 604800);
        }
      }
      robotsTxtCache.set(robotsTxtUrl, robotsTxt, ttl, (err) => { // eslint-disable-line no-shadow
        if (err) { fn(new Error(`robots.txt cache error: ${err.message}`)); return; }

        handle(robotsTxt);
      });
    });
  });
}

function defaultConfig() {
  return { instances: require('./default_instances.json') };
}

function writeConfig() {
  bot.writeDataFile('config.json', JSON.stringify(moduleConfig), (err) => {
    if (err) { log.error(`error writing mastodon module data: ${err}`); }
  });
}

function checkHostname(hostname) {
  if (moduleConfig.blocks && moduleConfig.blocks.includes(hostname)) { return false; }

  return moduleConfig.instances && moduleConfig.instances.includes(hostname);
}

/* TODO: Add support for validating GNU social? */
/* TODO: Don't check instances more than once a day. */
function forceCheckHostname(hostname, fn) {
  robotRequest(
    { url: `https://${hostname}/api/v1/instance` },
    (error, response, bodyRaw) => {
      let body;

      if (error || response.statusCode >= 400) { return fn(false); }

      try {
        body = JSON.parse(bodyRaw);
      } catch (e) {
        return fn(false);
      }

      if (!body.uri) { return fn(false); }

      fn(true);
      log.info(`adding ${response.request.host} to instance list`);
      if (moduleConfig.instances) {
        moduleConfig.instances.push(response.request.host);
      } else {
        moduleConfig.instances = [response.request.host];
      }
      return writeConfig();
    },
  );
}

/*
 * fetchResource only attempts to fetch the URL given as a particular content
 * type. This is less than what a full ActivityPub-implementing client needs to
 * handle; following Link headers and <link> HTML tags of the correct content
 * types would also be required.
 */
function fetchResource(url, fn) {
  robotRequest({
    url,
    headers: { Accept: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/activity+json' },
  }, (error, response, body) => {
    if (error) {
      fn(error);
    } else if (response.statusCode >= 400) {
      fn(new Error(`response status code is ${response.statusCode}`));
    } else if (!['application/ld+json', 'application/activity+json'].includes(contentType.parse(response.headers['content-type']).type)) {
      fn(new Error('resource is not an ActivityPub record'));
    } else {
      try {
        const record = JSON.parse(body);
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
  return htmlToTextMod.fromString(s, {
    wordwrap: null,
    ignoreHref: true,
  });
}

function formatRecord(record, fn) {
  if (record.type === 'Note') {
    fetchResource(record.attributedTo, (error, userRecord) => {
      let str = '';
      if (error) {
        str += '(error getting user): ';
      } else {
        str += `${userRecord.name} (@${userRecord.preferredUsername}): `;
      }
      if (record.sensitive) {
        str += `[content warning] ${record.summary}`;
      } else {
        str += htmlToText(record.content);
      }
      fn(str);
    });
  } else if (record.type === 'Person') {
    fn(`${record.name} (@${record.preferredUsername}): ${htmlToText(record.summary)}`);
  }
}

module.exports.commands = ['masto'];

module.exports.init = (b) => {
  bot = b;
  log = bot.log;

  bot.readDataFile('config.json', (err, data) => {
    if (err) {
      log.info('initializing mastodon module data');
      moduleConfig = defaultConfig();
    } else {
      try {
        moduleConfig = JSON.parse(data);
      } catch (ex) {
        moduleConfig = defaultConfig();
      }
    }
    writeConfig();
  });

  let userAgent = moduleConfig !== null ? moduleConfig.userAgent : 'EuIrcBot';
  try {
    const ver = require('../../package.json').version;
    userAgent += `/${ver}`;
  } catch (ex) {
    log.error(`error getting package version: ${ex}`);
  }

  let userAgentUrl = (moduleConfig !== null ? moduleConfig.userAgentUrl
    : 'https://github.com/euank/EuIrcBot/blob/{commitish}/modules/mastodon/info.md');
  if (userAgentUrl.includes('{commitish}')) {
    let commitish = 'master';
    try {
      commitish = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (ex) {
      log.error(`error determining deployed commit: ${ex}`);
    }
    userAgentUrl = userAgentUrl.replace(/{commitish}/g, commitish);
  }
  userAgent += ` (+${userAgentUrl})`;

  request = require('request').defaults({
    headers: { 'User-Agent': userAgent },
  });
};

function handleUrl(url, reply, verbose = false) {
  fetchResource(url, (error, record) => {
    if (error) {
      log.info({ error, mastodonUrl: url });
      if (verbose) { reply(`error: ${error.message}`); }
    } else {
      formatRecord(record, s => reply.custom({ replaceNewlines: true }, s));
    }
  });

  /*
   * Instance autodiscovery: hit /api/v1/timelines/public and look for any new
   * instance domains, then run those through forceCheckHostname to see if they
   * ought to be added to our list.
   *
   * This will cause Pleroma instances to be added to the whitelist, even
   * though they don't support ActivityPub objects, because they support the
   * Mastodon client API.
   */

  robotRequest(
    { url: urlMod.resolve(url, '/api/v1/timelines/public') },
    (error, response, bodyRaw) => {
      let body;

      if (error || response.statusCode >= 400) { return; }

      try {
        body = JSON.parse(bodyRaw);
      } catch (e) {
        return;
      }

      [...new Set(body.map((item) => {
        try {
          return urlMod.parse(item.url).host;
        } catch (ex) {
          log.warn(`url.parse threw: ${ex}`);
          return '';
        }
      }))].forEach((hostname) => {
        if (moduleConfig.blocks && moduleConfig.blocks.includes(hostname)) { return; }
        if (!moduleConfig.instances || !moduleConfig.instances.includes(hostname)) {
          forceCheckHostname(hostname, () => {});
        }
      });
    },
  );
}

/*
 * When a user calls "!masto [url]", both run and url get called. The first
 * thing we do in each of these methods is check the domain against
 * knownInstances; run only continues if the instance is unknown, and url only
 * continues if the instance is known.
 */

module.exports.run = (remainder, parts, reply) => {
  let url;
  try {
    url = urlMod.parse(remainder);
  } catch (ex) {
    log.warn(`url.parse threw: ${ex}`);
    return;
  }
  if (!checkHostname(url.host)) {
    forceCheckHostname(url.host, (ok) => {
      if (ok) {
        handleUrl(url.href, reply, true);
      } else {
        reply('error: not a mastodon instance');
      }
    });
  }
};

module.exports.url = (urlStr, reply) => {
  let url;
  try {
    url = urlMod.parse(urlStr);
  } catch (ex) {
    log.warn(`url.parse threw: ${ex}`);
    return;
  }
  if (checkHostname(url.host)) {
    handleUrl(url.href, reply);
  }
};
