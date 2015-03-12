var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var config, bot, transporter;
var addresses = {}

function sendMailTo(user, channel, text, reply) {
	if(!addresses[channel] || !addresses[channel][user]) {
		reply("Who the heck is that");
	}

	transporter.sendMail({
		from: config.from,
		to: addresses[channel][user],
		subject: config.subject,
		text: text
	}, function(error, info) {
		if(error) {
			reply(error);
			return;
		}
		reply(info.response);
	});
}


module.exports.init = function(b) {
	bot = b;
	config = bot.getConfig("page.json", function(err, conf) {
		if(err == null) {
			config = conf;
			transporter = nodemailer.createTransport(smtpTransport(config));

			transporter.on('log', function(log) {
				console.log(log);
			});

		}
		else {
			console.err("Can't get pager config");
		}
	});
}

module.exports.commands = {
	addpager: function(r, p, reply, command, from, channel) {
		if(p.length >= 1) {
			if(!addresses[channel]) {
				addresses[channel] = {};
			}
			addresses[channel][from] = p[0];
			reply("Added address " + p[0] + " for user " + from);
		}
		else {
			reply("you didn't tell me enough stuff, doofus");
		}
	},

	page: function(r, p, reply, command, from, channel) {
		if(p.length >= 2) {
			sendMailTo(p[0], channel, p.slice(1).join(" "), reply);
		}
		else {
			reply("Yah I don't know what that means");
		}
	}
}
