Hello! You may have reached this document from a user agent string in your access logs.

EuIrcBot is an IRC bot, and this is part of its Mastodon module, which:

* fetches statuses linked by users in an IRC channel, and replies with the content;
* fetches the last 20 toots from the public timeline to discover additional instances to add to its whitelist; and
* sometimes verifies that hostnames are actually Mastodon instances.

To do this, the module may make requests to URLs for users and toots, and the following requests to [a Mastodon instance's API](https://github.com/tootsuite/documentation/blob/master/Using-the-API/API.md):

* `GET /api/v1/timelines/public`
* `GET /api/v1/instance`

This module checks for `User-agent: EuIrcBot` in robots.txt and follows `Disallow` directives there. It does not follow any directives under the wildcard `User-agent: *`. It is recommended to block abusive IP addresses instead of block all users of this IRC bot module.
