var async = require('async'),
    fs = require('fs'),
    GitHubAPI = require('github'),
    _ = require('underscore');

var github = new GitHubAPI({
    version: "3.0.0",
    protocol: "https",
    timeout: 5000
});

function WatchManager() {
    var storageNamespace = "github",
        storageFilename = "watchman.json";

    var repos = {},
        issues = {};

    function GithubRepo(dataObj) {
        for (var prop in dataObj) this[prop] = dataObj[prop];

        this.checkForUpdates = function(callback) {
            var self = this;
            var hasChanged = false;
            github.repos.getCommits({
                user: this.user,
                repo: this.repo
            }, function(err, res) {
                if (err) {
                    callback(err, false);
                } else {
                    var mostRecent = res[0];

                    // Update internal info
                    if (mostRecent.sha != self.lastCommitSeen) {
                        hasChanged = true;
                        self.lastCommitSeen = mostRecent.sha;
                        // Get just the first line of the commit message
                        var cMessage = mostRecent.commit.message;
                        self.lastCommitMessage = cMessage.split('\n')[0];
                        self.lastCommiter = mostRecent.committer.login;
                        self.lastCommitUrl = mostRecent.commit.url;
                    }
                    callback(null, hasChanged);
                }
            });
        }

        this.generateUpdateMessage = function() {
            var self = this;
            var msg = ["Github -- New commits on " + self.getKey(),
                       "Most recent - " + self.lastCommiter + ': ' +
                           self.lastCommitMessage];
            return msg;
        }

        this.getKey = function() {
            return [this.user, this.repo].join('/');
        }
    }

    function GithubIssue(dataObj) {
        for (var prop in dataObj) this[prop] = dataObj[prop];

        this.checkForUpdates = function(callback) {
            var self = this;
            var hasChanged = false;
            github.issues.getRepoIssue({
                user: this.user,
                repo: this.repo,
                number: this.issue,
                direction: "desc"
            }, function(err, res) {
                var firstRes = res;
                // Check for comment changes
                if (err) {
                    callback(err, false);
                } else {
                    if (self.lastCommentNumber == res.comments) {
                        doneCheckingComments(firstRes, []);
                    } else {
                        github.issues.getComments({
                            user: self.user,
                            repo: self.repo,
                            number: self.issue
                        }, function(err, res) {
                            var comments = [];
                            if (!err) {
                                comments = res;
                            }
                            doneCheckingComments(firstRes, comments);
                        });
                    }
                }
            });

            function doneCheckingComments(res, comments) {
                var currCommNumber = parseInt(self.lastCommentNumber);
                if (self.title != res.title) {
                    self.title = res.title;
                }
                if (comments.length || res.state != self.lastStatus) {
                    hasChanged = true;
                    self.lastStatus = res.state;
                    self.lastCommentNumber = '' + res.comments;

                    // Get all commenters in last comments
                    var numComments = res.comments - currCommNumber;
                    var recentComments = _.first(comments, numComments);
                    var recentUsers = _.map(recentComments, function(comm) {
                        return comm.user.login;
                    });
                    self.lastCommenters = _.reduce(recentUsers, function(m, u) {
                        if (m.indexOf(u) == -1) {
                            m.push(u);
                        }
                        return m;
                    }, []);
                }
                callback(null, hasChanged);
            }
        }

        this.generateUpdateMessage = function() {
            var self = this;
            var msg = ["Github -- Update for issue " + this.getKey() + ".",
                "Current status: " + self.lastStatus + '.'];

            if (this.lastCommenters.length) {
                var commenters = JSON.stringify(this.lastCommenters);
                msg.push("New comments by " + commenters);
            }

            return msg;
        }

        this.getKey = function() {
            return [this.user, this.repo, this.issue].join('/');
        }
    }
   

    /* Repos are stored as:
     * {
     *     user: username,
     *     repo: repository,
     *     lastCommitSeen: sha
     * }
     *
     * Issues stored as:
     * {
     *     user: username,
     *     repo: repository,
     *     issue: issueNumber,
     *     lastStatus: status,
     *     lastCommentNumber: comment
     *     lastCommenters: [commenters]
     * }
     */
    this.load = function(callback) {
        var self = this;
        bot.fsGetData(storageNamespace, storageFilename, function(err, res) {
            if (err) {
                // There's nothing there yet!
                var initData = JSON.stringify({
                    repos: [],
                    issues: [],
                    version: "1.0"
                });
                repos = {};
                issues = {};
                bot.fsStoreData(storageNamespace, storageFilename, initData,
                        function() {
                    callback();
                });
            } else {
                var savData = JSON.parse(res);
                if (res.hasOwnProperty('version')) {
                    self.configVersion = res.version;
                } else {
                    self.configVersion = '1.0';
                }
                var repoList = _.map(savData.repos, function(repoData) {
                    return new GithubRepo(repoData);
                });
                var issueList = _.map(savData.issues, function(issueData) {
                    return new GithubIssue(issueData);
                });
                repos = {};
                issues = {};
                _.each(repoList, function(repo) {
                    var key = repo.getKey();
                    repos[key] = repo;
                });
                _.each(issueList, function(issue) {
                    var key = issue.getKey();
                    issues[key] = issue;
                });
                callback();
            }
        });
    }

    this.overwrite = function(callback) {
        var repoList = _.values(repos),
            issueList = _.values(issues);
        var data = JSON.stringify({
            repos: repoList,
            issues: issueList,
            version: this.configVersion
        });
        bot.fsStoreData(storageNamespace, storageFilename, data,
                function(err, res) {
            if (callback) callback();
        });
    }

    this.checkForUpdates = function(callback) {
        var self = this;
        var numChecked = 0;
        var repoList = _.values(repos),
            issueList = _.values(issues);
        var repoLen = repoList.length,
            issueLen = issueList.length;
        var anyChanged = false;
        _.each(repoList, function(repo) {
            console.log("Checking " + repo.getKey() + " for updates");
            repo.checkForUpdates(function(err, changed) {
                numChecked++;
                if (err) {
                    bot.say("Error reaching repo " + repo.getKey());
                } else if (changed) {
                    anyChanged = true;
                    bot.say(repo.generateUpdateMessage().join(' '));
                }
                maybeDone();
            });
        });
        _.each(issueList, function(issue) {
            console.log("Checking " + issue.getKey() + " for updates");
            issue.checkForUpdates(function(err, changed) {
                numChecked++;
                if (err) {
                    bot.say("Error reaching issue " + issue.getKey());
                } else if (changed) {
                    anyChanged = true;
                    bot.say(issue.generateUpdateMessage().join(' '));
                }
                maybeDone();
            });
        });
        function maybeDone() {
            if (numChecked == repoLen + issueLen) {
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
            var repoData = { user: username, repo: repository };
            var repo = new GithubRepo(repoData);
            repo.checkForUpdates(function() {
                repos[key] = repo;
                self.overwrite(function() {
                    callback("Watching", key + ".", "Last commit seen:",
                            repo.lastCommitSeen);
                });
            });
        }
    }

    this.watchIssue = function(username, repository, issueNum, callback) {
        var self = this;
        var key = [username, repository, issueNum].join('/');
        if (issues.hasOwnProperty(key)) {
            callback("Issue", key, "is already being watched.");
        } else {
            var issueData = {
                user: username,
                repo: repository,
                issue: issueNum,
                title: '',
                lastStatus: '',
                lastCommentNumber: '',
                lastCommenters: []
            };
            var issue = new GithubIssue(issueData);
            issue.checkForUpdates(function(err, changed) {
                if (err) {
                    callback("Github response is dicked. Could not add", key);
                } else {
                    issues[key] = issue;
                    self.overwrite(function() {
                        callback("Now watching issue", key, '|', issue.title,
                            "|", issue.lastStatus);
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

    this.unwatchIssue = function(username, repository, issueNum, callback) {
        var key = [username, repository, issueNum].join('/');
        delete issues[key];
        this.overwrite(function() {
            callback("Stopped watching", key);
        });
    }
}

var bot,
    watchMan = new WatchManager(),
    updateInterval = 60000 * 15;  // 15 Minutes

module.exports.init = function(b) {
    bot = b;
    watchMan.load(function() {
        function check() {
            watchMan.checkForUpdates(function() {
                setTimeout(check, updateInterval);
            });
        }
        check();
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
        // Polls a github repo or issue and posts updates
        watch: function(r, p, reply) {
            var watchType = p[0];

            if (watchType == 'repo') {
                var user = p[1],
                    repo = p[2];
                watchMan.watchRepo(user, repo, reply);
            } else if (watchType == 'issue') {
                var user = p[1],
                    repo = p[2],
                    issueNum = p[3];
                watchMan.watchIssue(user, repo, issueNum, reply);
            } else {
                reply("Usage: watch [repo|issue] username repo [issuenum]");
            }
        },
        unwatch: function(r, p, reply) {
            var watchType = p[0];

            if (watchType == 'repo') {
                var user = p[1],
                    repo = p[2];
                watchMan.unwatchRepo(user, repo, reply);
            } else if (watchType == 'issue') {
                var user = p[1],
                    repo = p[2],
                    issueNum = p[3];
                watchMan.unwatchIssue(user, repo, issueNum, reply);
            } else {
                reply("Usage: unwatch [repo|issue] username repo [issuenum]");
            }
        }
    }
}
