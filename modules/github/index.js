var GitHubAPI = require('github'),
    _ = require('underscore');

var github = new GitHubAPI({
    version: "3.0.0",
    protocol: "https",
    timeout: 5000
});

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

            cb(name, '| ', description, language, '| ', forks);
        }
    });
}

var githubURLRegexes = [
    {
        name: "User",
        regex: /github\.com\/(\w+)\/?/,
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
        name: "Repo",
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/?/,
        getMessage: getRepoInformation
    },
    {
        name: "Commit",
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/commit\/(\w+)\/?/,
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
        name: "Issue",
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/issues\/(\d+)\/?/,
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
        name: "IO Page",
        regex: /\/\/(\w+)\.github\.io\/((?:\w|-)+)\/?/,
        getMessage: getRepoInformation
    }
];

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
