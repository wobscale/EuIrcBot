var GitHubAPI = require('github');

var github = new GitHubAPI({
    version: "3.0.0",
    protocol: "https",
    timeout: 5000
});

var githubURLRegexes = [
    {
        name: "User",
        regex: /github\.com\/(\w+)\/?$/,
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
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/?$/,
        getMessage: function(username, reponame, cb) {
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
    },
    {
        name: "Commit",
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/commit\/(\w+)\/?$/,
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
        regex: /github\.com\/(\w+)\/((?:\w|-)+)\/issues\/(\d+)\/?$/,
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
    }
];

module.exports.url = function(url, reply) {
    var matchInfo, githubObj;
    for (var i = 0; i < githubURLRegexes.length; i++) {
        var obj = githubURLRegexes[i];
        if ((matchInfo = obj.regex.exec(url))) {
            githubObj = obj;
            break;
        }
    }
    if (githubObj) {
        matchInfo.shift();
        matchInfo.push(reply);
        githubObj.getMessage.apply(githubObj, matchInfo);
    }
}
