var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var config, bot, transporter;
var addresses = {}

function sendMailTo(alias, text, reply) {
	if(!addresses.alias) {
		reply("Who the heck is that");
	}

	transporter.sendMail({
		from: config.from,
		to: addresses.alias,
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
	addpager: function(r, p, reply) {
		if(p.length >= 2) {
			addresses[p[0]] = p[1];
			reply("Added address " + p[1] + " for alias " + p[0]);
		}
		else {
			reply("you didn't tell me enough stuff, doofus");
		}
	},

	page: function(r, p, reply) {
		if(p.length >= 2) {
			sendMailTo(p[0], p.slice(1).join(" "), reply);
		}
		else {
			reply("Yah I don't know what that means");
		}
	}
}
