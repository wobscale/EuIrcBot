let async = require('async'),
  fs = require('fs'),
  GitHubAPI = require('github'),
  _ = require('underscore');

const github = new GitHubAPI({
  version: '3.0.0',
  protocol: 'https',
  timeout: 5000,
});

module.exports.name = 'github';

// Only auth if auth details given
github.tryAuthenticate = function () {
  if (typeof config === 'undefined') return false;

  const authType = config.type;
  let authed = false;
  if (authType.length) {
    this.authenticate(config);
    authed = true;
  }
  return authed;
};

let config;

function WatchManager() {
  let storageNamespace = 'github',
    storageFilename = 'watchman.json';

  let repos = {},
    issues = {};

  function GithubRepo(dataObj) {
    for (const prop in dataObj) this[prop] = dataObj[prop];

    let recentlySeen = [];

    this.checkForUpdates = function (callback) {
      const self = this;
      let hasChanged = false;

      github.tryAuthenticate();
      github.events.getFromRepo({
        user: this.user,
        repo: this.repo,
      }, (err, res) => {
        if (err) {
          callback(err, false);
        } else {
          const mostRecent = res[0];

          if (mostRecent.id != self.lastSeenEventId) {
            hasChanged = true;
            const ls = self.lastSeenEventId;
            // An update has occured, get unseen messages
            let itr = 0,
              currEvent = { id: '' };
            recentlySeen = [];
            if (res.length) currEvent = res[0];
            while (itr < res.length && currEvent.id != ls) {
              recentlySeen.push(currEvent);
              itr++;
              currEvent = res[itr];
            }
            self.lastSeenEventId = mostRecent.id;
          }
          callback(null, hasChanged);
        }
      });
    };

    this.getHTMLUrl = function () {
      return `https://github.com/${this.user}/${this.repo}`;
    };

    this.generateUpdateMessage = function () {
      const self = this;
      const msg = [];
      const key = this.getKey();
      _.each(recentlySeen, (githubEvent) => {
        let payload = githubEvent.payload,
          user = githubEvent.actor.login;
        switch (githubEvent.type) {
          case 'CommitCommentEvent':
            var comment = payload.comment;
            var commitId = `[${comment.commit_id.substr(0, 7)
              }...]`,
              link = comment.html_url;
            msg.push(['Github --', user, 'commented on commit',
              commitId, 'for repo', `${key}.`, link].join(' '));
            break;
          case 'PushEvent':
            var numCommits = payload.size,
              ref = payload.ref.split('/'),
              head = payload.head.substr(0, 7),
              before = payload.before.substr(0, 7);
            ref = ref[ref.length - 1];
            var link = `${self.getHTMLUrl()}/compare/${before
            }...${head}`;
            msg.push(['Github --', `[${key}]`, user, 'pushed',
              numCommits, 'commits to', `${ref}.`,
              link].join(' '));
            _.each(payload.commits, (commit) => {
              // Generate message for each commit
              let sha = commit.sha.substr(0, 6),
                message = commit.message.split('\n')[0];
              msg.push(['Github --', `${key}/${ref}`, sha,
                `${user}:`, message].join(' '));
            });
            break;
          case 'IssuesEvent':
            var action = payload.action,
              issueNum = payload.issue.number,
              title = payload.issue.title,
              link = payload.issue.html_url;
            msg.push(['Github --', user, action, 'issue',
              `#${issueNum}`, 'for repo', `${key}:`,
              `${title}.`, link].join(' '));
            break;
          case 'IssueCommentEvent':
            var issueNum = payload.issue.number,
              title = payload.issue.title,
              link = payload.comment.html_url;
            msg.push(['Github --', user, 'commented on issue',
              `#${issueNum}`, 'for repo', `${key}:`,
              `${title}.`, link].join(' '));
            break;
          case 'PullRequestEvent':
            var action = payload.action,
              prNumber = payload.number,
              link = payload.pull_request.html_url,
              title = payload.pull_request.title;
            msg.push(['Github --', user, action,
              'pull request for repo', key,
              `PR #${prNumber}:`, `${title}.`,
              link].join(' '));
            break;
          case 'PullRequestReviewCommentEvent':
            var prNumber = payload.pull_request.number,
              title = payload.pull_request.title,
              link = payload.comment.html_url;
            msg.push(['Github --', user,
              'commented on a pull request for repo', key,
              `PR #${prNumber}:`, `${title}.`,
              link].join(' '));

            break;
          case 'ForkEvent':
            var link = payload.forkee.html_url;
            msg.push(['Github -- ', user, 'forked repo', `${key}!`,
              'Neat!', link].join(' '));
            break;
          default:
            break;
        }
      });
      return msg;
    };

    this.getKey = function () {
      return [this.user, this.repo].join('/');
    };
  }

  this.load = function (callback) {
    const self = this;
    bot.fsGetData(storageNamespace, storageFilename, (err, res) => {
      if (err) {
        // There's nothing there yet!
        const initData = JSON.stringify({
          repos: [],
          version: '1.0',
        });
        repos = {};
        bot.fsStoreData(
          storageNamespace, storageFilename, initData,
          () => {
            callback();
          },
        );
      } else {
        const savData = JSON.parse(res);
        if (res.hasOwnProperty('version')) {
          self.storageVersion = res.version;
        } else {
          self.storageVersion = '1.0';
        }
        const repoList = _.map(savData.repos, repoData => new GithubRepo(repoData));
        repos = {};
        _.each(repoList, (repo) => {
          const key = repo.getKey();
          repos[key] = repo;
        });
        callback();
      }
    });
  };

  this.overwrite = function (callback) {
    const repoList = _.values(repos);
    const data = JSON.stringify({
      repos: repoList,
      version: this.storageVersion,
    });
    bot.fsStoreData(
      storageNamespace, storageFilename, data,
      (err, res) => {
        if (callback) callback();
      },
    );
  };

  this.checkForUpdates = function (callback) {
    const self = this;
    let numChecked = 0;
    const repoList = _.values(repos);
    const repoLen = repoList.length;
    let anyChanged = false;

    _.each(repoList, (repo) => {
      repo.checkForUpdates((err, changed) => {
        numChecked++;
        if (!err && changed) {
          anyChanged = true;
          _.each(repo.generateUpdateMessage(), (msg) => {
            bot.say(msg);
          });
        }
        maybeDone();
      });
    });
    function maybeDone() {
      if (numChecked == repoLen) {
        if (anyChanged) {
          self.overwrite(() => {
            if (callback) callback();
          });
        } else if (callback) callback();
      }
    }
    // Just in case there are no repos to check
    maybeDone();
  };

  this.watchRepo = function (username, repository, callback) {
    const self = this;
    const key = [username, repository].join('/');
    if (repos.hasOwnProperty(key)) {
      callback('Repo', key, 'is already being watched.');
    } else {
      const repoData = {
        user: username,
        repo: repository,
        lastSeenEventId: '',
      };
      const repo = new GithubRepo(repoData);
      repo.checkForUpdates((err) => {
        if (err) {
          callback(
            'Github response is dicked. Could not watch repo',
            key,
          );
        } else {
          repos[key] = repo;
          self.overwrite(() => {
            callback(`Watching repo ${key}`);
          });
        }
      });
    }
  };

  this.unwatchRepo = function (username, repository, callback) {
    const key = [username, repository].join('/');
    delete repos[key];
    this.overwrite(() => {
      callback('Stopped watching', key);
    });
  };

  this.listRepos = function () {
    return _.sortBy(_.keys(repos));
  };
}

let bot,
  watchMan = new WatchManager(),
  updateInterval = 60000 * 15; // Default 15 minute updates
module.exports.init = function (b) {
  bot = b;
  bot.getConfig('github.json', (err, conf) => {
    config = conf;
    if (github.tryAuthenticate()) { updateInterval = 1 * 60000; } // 1 minute updates if authed
    watchMan.load(() => {
      function check() {
        // Always run no matter what
        try {
          watchMan.checkForUpdates(() => {
            setTimeout(check, updateInterval);
          });
        } catch (e) {
          console.log(e);
          setTimeout(check, updateInterval);
        }
      }
      check();
    });
  });
};


let USER_REGEX = /https?:\/\/(?:www\.)?github\.com\/((?:\w|-)+)\/?/,
  REPO_REGEX = /https?:\/\/(?:www\.)?github\.com\/((?:\w|-)+)\/((?:\w|-|\.)+)\/?/,
  COMMIT_REGEX = /https?:\/\/(?:www\.)?github\.com\/((?:\w|-)+)\/((?:\w|-|\.)+)\/commit\/(\w+)\/?/,
  ISSUE_REGEX = /https?:\/\/(?:www\.)?github\.com\/((?:\w|-)+)\/((?:\w|-|\.)+)\/issues\/(\d+)\/?/,
  IO_PAGE_REGEX = /https?:\/\/(?:www\.)?((?:\w|-)+)\.github\.io\/((?:\w|-)+)\/?/;


/* Any of these base paths will be immediately ignored by onUrl.
 *
 * There is not a good way to find a comprehensive list of reserved URLS by
 * github; however, this list is created as of
 * https://github.com/euank/EuIrcBot/issues/34
 */
let blacklistedPaths = [
  '/about',
  '/blog',
  '/contact',
  '/explore',
  '/features',
  '/plans',
  '/privacy',
  '/search',
  '/security',
  '/showcases',
  '/stars',
  '/styleguide',
  '/terms',
  '/trending',
];
// Generate regexp strings
blacklistedPaths = _.map(blacklistedPaths, (pathBase) => {
  const reg = ['^https?:\/\/(?:www\.)?github.com\\', pathBase, '\/.*$'];
  return new RegExp(reg.join(''));
});


/* Generates IRC message from github username/repo by querying that repo and
 * gathering various stats such as language and number of forks
 */
function getRepoInformation(username, reponame, cb) {
  github.tryAuthenticate();
  github.repos.get({
    user: username,
    repo: reponame,
  }, (err, res) => {
    if (err) {
      cb('Github response is dicked');
    } else {
      let name = res.name,
        description = res.description,
        language = res.language,
        forks = `Forks: ${res.forks_count}`;
      if (!language) { language = ''; } else { language = `| ${language}`; }
      if (description.length > 60) { description = description.substr(0, 40); }
      if (description.length > 0) { description = `| ${description}`; }

      cb(name, description, language, '| ', forks);
    }
  });
}

/* To add support for a new github link type, construct a regex and add it to
 * the declarations above. Add an object to this list containing two keys:
 *
 * regex -- the regex to use to try and match links
 * getMessage -- A function taking an argument for each group matched in the
 *     regex, as well as a final callback function, which is the text that the
 *     bot will say in the irc channel.
 */
const githubURLRegexes = [
  {
    regex: USER_REGEX,
    getMessage(username, cb) {
      github.tryAuthenticate();
      github.user.getFrom({
        user: username,
      }, (err, res) => {
        if (err) {
          cb('Github response is dicked');
        } else {
          let followers = res.followers,
            following = res.following,
            publicRepose = res.public_repos,
            company = res.company;
          if (!company) company = '';
          else company = `Works for ${company} |`;

          cb(
            `${username}:`, company, 'Followers:',
            followers, '| Following:', following,
          );
        }
      });
    },
  },
  {
    regex: REPO_REGEX,
    getMessage: getRepoInformation,
  },
  {
    regex: COMMIT_REGEX,
    getMessage(username, reponame, commit, cb) {
      github.tryAuthenticate();
      github.repos.getCommit({
        user: username,
        repo: reponame,
        sha: commit,
      }, (err, res) => {
        if (err) {
          cb('Github response is dicked');
        } else {
          let committer = res.committer,
            message = res.commit.message;
          if (committer == null) {
            committer = res.committer.name;
          } else {
            committer = res.committer.login;
          }
          // Extract first line of commit message
          message = /.*/.exec(message);
          if (message) message = message[0];
          else message = '';
          if (message.length > 50) message = message.substr(0, 50);

          cb('Commit to', reponame, 'by', `${committer}:`, message);
        }
      });
    },
  },
  {
    regex: ISSUE_REGEX,
    getMessage(username, reponame, issue, cb) {
      github.tryAuthenticate();
      github.issues.getRepoIssue({
        user: username,
        repo: reponame,
        number: issue,
      }, (err, res) => {
        if (err) {
          cb('Github response is dicked');
        } else {
          let title = res.title,
            state = res.state;
          cb('Issue for', `${reponame}:`, title, '|', state);
        }
      });
    },
  },
  {
    regex: IO_PAGE_REGEX,
    getMessage: getRepoInformation,
  },
];

/* If a URL is said, try and match it to a github url and post info. */
module.exports.url = function (url, reply) {
  // If the URL is on the blacklist, just exit
  const blacklisted = _.filter(blacklistedPaths, (pathRegex) => {
    const execd = pathRegex.exec(url);
    return execd && execd.length;
  });
  if (blacklisted.length) return;

  let matchInfo,
    githubObj;
  const matched = [];
  for (let i = 0; i < githubURLRegexes.length; i++) {
    const obj = githubURLRegexes[i];
    if ((matchInfo = obj.regex.exec(url))) {
      githubObj = obj;
      matched.push({
        githubObj,
        matchInfo,
      });
    }
  }
  if (matched.length) {
    /* Find the longest URL that was matched, that way subdirs get matched
         * to the most applicable parent dir.
         */
    const sorted = _.sortBy(matched, match => -match.matchInfo[0].length);
    matchInfo = sorted[0].matchInfo;
    githubObj = sorted[0].githubObj;

    matchInfo.shift();
    matchInfo.push(reply);
    githubObj.getMessage(...matchInfo);
  }
};

module.exports.commands = {
  github: {
    _default(r, p, reply) {
      reply('Usage: !github watch [username] [reponame]');
    },
    watch(r, p, reply) {
      let user = p[0],
        repo = p[1];
      watchMan.watchRepo(user, repo, reply);
    },
    unwatch(r, p, reply) {
      let user = p[0],
        repo = p[1];
      watchMan.unwatchRepo(user, repo, reply);
    },
    list(r, p, reply) {
      const watching = watchMan.listRepos();
      if (watching.length) {
        bot.say('Github -- Watching repos:');
        _.each(watching, (repoKey) => {
          bot.say(`-  ${repoKey}`);
        });
      } else {
        bot.say('No repos being watched.');
      }
    },
  },
};
