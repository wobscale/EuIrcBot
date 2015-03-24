var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var aws = require('aws-sdk');

var config, bot, transporter;;
var addresses = {};
var ses = null;

function getAddresses(channel, cb) {
	bot.readDataFile(channel + '.json', function(err, res) {
		if(err) {
			console.log("no data");
			addresses[channel] = {};
			cb();
		}
		else {
			addresses[channel] = JSON.parse(res);
			cb();
		}
	});
}

function saveAddresses(channel) {
	bot.writeDataFile(channel + '.json', JSON.stringify(addresses[channel]), function(err) {
		if(err)console.log("Error saving addresses for channel " + channel);
	});
}

function sendMailTo(user, channel, text, reply) {
	getAddresses(channel, function() {

		if(!addresses[channel] || !addresses[channel][user]) {
			reply("Who the heck is that");
		}

    if(ses) {
      ses.sendEmail({
        Destination:{
          ToAddresses:[addresses[channel][user]]
        },
        Message:{
          Subject:{
            Data:config.subject
          },
          Body:{
            Text:{
              Data: text
            }
          }
        },
        Source:config.from,
      },
      function(err, data) {
        if(err) {
          reply(err);
          return;
        }
        reply("beep boop beep boop");
      });
    }
    else {
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
        reply("beep boop beep boop");
      });
    }
	});
}


module.exports.init = function(b) {
	bot = b;
	config = bot.getConfig("page.json", function(err, conf) {
		if(err == null) {
			config = conf;
			transporter = nodemailer.createTransport(smtpTransport(config));

			if(config['accessKeyId']) {
				ses = new aws.SES(config);
			}

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
      getAddresses(channel, function() {
        if(ses) {
          ses.verifyEmailIdentity({'EmailAddress': p[0]}, function(err, data) {
            if(err) {
              console.log("SES email verify error " + err);
            }
            else {
              addresses[channel][from] = p[0];
              saveAddresses(channel);
              reply("Added address " + p[0] + " for user " + from);
            }
          });
        }
        else {
          addresses[channel][from] = p[0];
          saveAddresses(channel);
          reply("Added address " + p[0] + " for user " + from);
        }
      });
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
