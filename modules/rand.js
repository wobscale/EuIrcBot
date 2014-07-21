exports.command = "rand";

exports.run = function(r, parts, reply) {
  reply(parts[Math.floor(Math.random() * parts.length)]);
};
