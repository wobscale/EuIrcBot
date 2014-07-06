var async = require('async'),
    fs = require('fs'),
    GitHubAPI = require('github'),
    _ = require('underscore');

var github = new GitHubAPI({
    version: "3.0.0",
    protocol: "https",
    timeout: 5000
});

// Only auth if auth details given
github.tryAuthenticate = function() {
    var authType = config.type;
    var authed = false;
    if (authType.length) {
        this.authenticate(config);
        authed = true;
    }
    return authed;
}

var config;

function WatchManager() {
    var storageNamespace = "github",
        storageFilename = "watchman.json";

    var repos = {},
        issues = {};

    function GithubRepo(dataObj) {
        for (var prop in dataObj) this[prop] = dataObj[prop];

        var recentlySeen = [];

        this.checkForUpdates = function(callback) {
            var self = this;
            var hasChanged = false;

            github.tryAuthenticate();
            github.events.getFromRepo({
                user: this.user,
                repo: this.repo
            }, function(err, res) {
                if (err) {
                    callback(err, false);
                } else {
                    var mostRecent = res[0];
                    
                    if (mostRecent.id != self.lastSeenEventId) {
                        hasChanged = true;
                        var ls = self.lastSeenEventId;
                        // An update has occured, get unseen messages
                        var itr = 0,
                            currEvent = { id: '' };
                        recentlySeen = [];
                        if (res.length) currEvent = res[0];
                        while (itr < res.length && currEvent.id != ls) {
                            recentlySeen.push(currEvent);
                            itr ++;
                            currEvent = res[itr];
                        }
                        self.lastSeenEventId = mostRecent.id;
                    }
                    callback(null, hasChanged);
                }
            });
        }

        this.getHTMLUrl = function() {
            return "https://github.com/" + this.user + "/" + this.repo;
        }

        this.generateUpdateMessage = function() {
            var self = this;
            var msg = [];
            var key = this.getKey();
            _.each(recentlySeen, function(githubEvent) {
                var payload = githubEvent.payload,
                    user = githubEvent.actor.login;
                switch (githubEvent.type) {
                    case "CommitCommentEvent":
                        var comment = payload.comment;
                        var commitId = '[' + comment.commit_id.substr(0, 7) + 
                                '...]',
                            link = comment.html_url;
                        msg.push(["Github --", user, "commented on commit",
                            commitId, "for repo", key + '.', link].join(' '));
                        break;
                    case "PushEvent":
                        var numCommits = payload.size,
                            ref = payload.ref;
                        msg.push(["Github --", user, "pushed", numCommits,
                            "commits to", key + '.', "ref:", ref + '.',
                            self.getHTMLUrl].join(' '));
                        break;
                    case "IssuesEvent":
                        var action = payload.action,
                            issueNum = payload.issue.number,
                            title = payload.issue.title,
                            link = payload.issue.html_url;
                        msg.push(["Github --", user, action, "issue",
                                "#" + issueNum, "for repo", key + ":",
                                title + '.', link].join(' '));
                        break;
                    case "IssueCommentEvent":
                        var issueNum = payload.issue.number,
                            title = payload.issue.title,
                            link = payload.comment.html_url;
                        msg.push(["Github --", user, "commented on issue",
                                "#" + issueNum, "for repo", key + ":",
                                title + '.', link].join(' '));
                        break;
                    case "PullRequestEvent":
                        var action = payload.action,
                            prNumber = payload.number,
                            link = payload.pull_request.html_url,
                            title = payload.pull_request.title;
                        msg.push(["Github --", user, action,
                                "pull request for repo", key,
                                "PR #" + prNumber + ":", title + '.',
                                link].join(' '));
                        break;
                    case "PullRequestReviewCommentEvent":
                        var prNumber = payload.pull_request.number,
                            title = payload.pull_request.title,
                            link = payload.comment.html_url;
                        msg.push(["Github --", user,
                                "commented on a pull request for repo", key,
                                "PR #" + prNumber + ":", title + '.',
                                link].join(' '));

                        break;
                    case "ForkEvent":
                        var link = payload.forkee.html_url;
                        msg.push(["Github -- ", user, "forked repo", key + "!",
                                "Neat!", link].join(' '));
                        break;
                    default:
                        break;
                }
            });
            return msg;
        }

        this.getKey = function() {
            return [this.user, this.repo].join('/');
        }
    }
   
    this.load = function(callback) {
        var self = this;
        bot.fsGetData(storageNamespace, storageFilename, function(err, res) {
            if (err) {
                // There's nothing there yet!
                var initData = JSON.stringify({
                    repos: [],
                    version: "1.0"
                });
                repos = {};
                bot.fsStoreData(storageNamespace, storageFilename, initData,
                        function() {
                    callback();
                });
            } else {
                var savData = JSON.parse(res);
                if (res.hasOwnProperty('version')) {
                    self.storageVersion = res.version;
                } else {
                    self.storageVersion = '1.0';
                }
                var repoList = _.map(savData.repos, function(repoData) {
                    return new GithubRepo(repoData);
                });
                repos = {};
                _.each(repoList, function(repo) {
                    var key = repo.getKey();
                    repos[key] = repo;
                });
                callback();
            }
        });
    }

    this.overwrite = function(callback) {
        var repoList = _.values(repos);
        var data = JSON.stringify({
            repos: repoList,
            version: this.storageVersion
        });
        bot.fsStoreData(storageNamespace, storageFilename, data,
                function(err, res) {
            if (callback) callback();
        });
    }

    this.checkForUpdates = function(callback) {
        var self = this;
        var numChecked = 0;
        var repoList = _.values(repos);
        var repoLen = repoList.length;
        var anyChanged = false;
        _.each(repoList, function(repo) {
            repo.checkForUpdates(function(err, changed) {
                numChecked++;
                if (err) {
                    bot.say("Github response is dicked for repo " +
                        repo.getKey());
                } else if (changed) {
                    anyChanged = true;
                    _.each(repo.generateUpdateMessage(), function(msg) {
                        bot.say(msg);
                    });
                }
                maybeDone();
            });
        });
        function maybeDone() {
            if (numChecked == repoLen) {
                if (anyChanged) {
                    self.overwrite(function() {
                        if (callback) callback();
                    });
                } else {
                    if (callback) callback();
                }
            }
        }
    }

    this.watchRepo = function(username, repository, callback) {
        var self = this;
        var key = [username, repository].join('/');
        if (repos.hasOwnProperty(key)) {
            callback("Repo", key, "is already being watched.");
        } else {
            var repoData = {
                user: username,
                repo: repository,
                lastSeenEventId: ''
            };
            var repo = new GithubRepo(repoData);
            repo.checkForUpdates(function(err) {
                if (err) {
                    callback("Github response is dicked. Could not watch repo",
                        key);
                } else {
                    repos[key] = repo;
                    self.overwrite(function() {
                        callback("Watching repo " + key);
                    });
                }
            });
        }
    }

    this.unwatchRepo = function(username, repository, callback) {
        var key = [username, repository].join('/');
        delete repos[key];
        this.overwrite(function() {
            callback("Stopped watching", key);
        });
    }
}

var bot,
    watchMan = new WatchManager(),
    updateInterval = 60000 * 15; // Default 15 minute updates
module.exports.init = function(b) {
    bot = b;
    bot.getConfig("github.json", function(err, conf) {
        config = conf;
        if (github.tryAuthenticate())
            updateInterval = 1 * 60000; // 1 minute updates if authed
        watchMan.load(function() {
            function check() {
                // Always run no matter what
                try {
                    watchMan.checkForUpdates(function() {
                        setTimeout(check, updateInterval);
                    });
                } catch(e) {
                    console.log(e);
                    setTimeout(check, updateInterval);
                }
            }
            check();
        });
    });
}

var USER_REGEX = /github\.com\/(\w+)\/?/,
    REPO_REGEX = /github\.com\/(\w+)\/((?:\w|-)+)\/?/,
    COMMIT_REGEX = /github\.com\/(\w+)\/((?:\w|-)+)\/commit\/(\w+)\/?/,
    ISSUE_REGEX = /github\.com\/(\w+)\/((?:\w|-)+)\/issues\/(\d+)\/?/,
    IO_PAGE_REGEX = /\/\/(\w+)\.github\.io\/((?:\w|-)+)\/?/;


/* Generates IRC message from github username/repo by querying that repo and
 * gathering various stats such as language and number of forks
 */
function getRepoInformation(username, reponame, cb) {
    github.tryAuthenticate();
    github.repos.get({
        user: username,
        repo: reponame
    }, function(err, res) {
        if (err) {
            cb("Github response is dicked");
        } else {
            var name = res.name,
                description = res.description,
                language = res.language,
                forks = "Forks: " + res.forks_count;
            if (!language)
                language = "";
            else
                language = "| " + language;
            if (description.length > 60)
                description = description.substr(0, 40);
            if (description.length > 0)
                description = '| ' + description;

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
var githubURLRegexes = [
    {
        regex: USER_REGEX,
        getMessage: function(username, cb) {
            github.tryAuthenticate();
            github.user.getFrom({
                user: username
            }, function(err, res) {
                if (err) {
                    cb("Github response is dicked");
                } else {
                    var followers = res.followers,
                        following = res.following,
                        publicRepose = res.public_repos,
                        company = res.company;
                        if (!company) company = "";
                        else company = "Works for " + company + " |";

                    cb(username + ":", company, "Followers:",
                        followers, "| Following:", following);
                }
            });
        }
    },
    {
        regex: REPO_REGEX,
        getMessage: getRepoInformation
    },
    {
        regex: COMMIT_REGEX,
        getMessage: function(username, reponame, commit, cb) {
            github.tryAuthenticate();
            github.repos.getCommit({
                user: username,
                repo: reponame,
                sha: commit
            }, function(err, res) {
                if (err) {
                    cb("Github response is dicked");
                } else {
                    var committer = res.committer.login,
                        message = res.commit.message;
                    // Extract first line of commit message
                    message = /.*/.exec(message);
                    if (message) message = message[0];
                    else message = "";
                    if (message.length > 50) message = message.substr(0, 50); 

                    cb("Commit to", reponame, "by", committer + ":", message);
                }
            });
        }
    },
    {
        regex: ISSUE_REGEX,
        getMessage: function(username, reponame, issue, cb) {
            github.tryAuthenticate();
            github.issues.getRepoIssue({
                user: username,
                repo: reponame,
                number: issue
            }, function(err, res) {
                if (err) {
                    cb("Github response is dicked");
                } else {
                    var title = res.title,
                        state = res.state;
                    cb("Issue for", reponame + ":", title, "|", state);
                }
            });
        }
    },
    {
        regex: IO_PAGE_REGEX,
        getMessage: getRepoInformation
    }
];

/* If a URL is said, try and match it to a github url and post info. */
module.exports.url = function(url, reply) {
    var matchInfo, githubObj;
    var matched = [];
    for (var i = 0; i < githubURLRegexes.length; i++) {
        var obj = githubURLRegexes[i];
        if ((matchInfo = obj.regex.exec(url))) {
            githubObj = obj;
            matched.push({
                githubObj: githubObj,
                matchInfo: matchInfo
            });
        }
    }
    if (matched.length) {
        /* Find the longest URL that was matched, that way subdirs get matched
         * to the most applicable parent dir.
         */
        var sorted = _.sortBy(matched, function(match) {
            return -match.matchInfo[0].length;
        });
        matchInfo = sorted[0].matchInfo;
        githubObj = sorted[0].githubObj;

        matchInfo.shift();
        matchInfo.push(reply);
        githubObj.getMessage.apply(githubObj, matchInfo);
    }
}

module.exports.commands = {
    github: {
        _default: function(r, p, reply) {
            reply("Usage: !github watch [username] [reponame]");
        },
        watch: function(r, p, reply) {
            var user = p[0],
                repo = p[1];
            watchMan.watchRepo(user, repo, reply);
        },
        unwatch: function(r, p, reply) {
            var user = p[0],
                repo = p[1];
            watchMan.unwatchRepo(user, repo, reply);
        }
    }
}
