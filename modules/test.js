/* eslint no-unused-vars: "ignore" */ // unused arguments to demonstrate what args are available

module.exports.init = function (bot) {};

module.exports.name = 'sirc-test';

module.exports.command = 'test';

const testOutputs = [
  'Hello and, again, welcome to the Aperture Science computer-aided enrichment center.',
  'Do not submerge the IRC Network in liquid',
  'Do not stare directly into the IRC Network',
  'This test is impossible; make no attempt to solve it',
  "Don't worry, you passed <3",
  'Is this a test?',
  'Do you think this is a test? Well, do you?',
  'If quizzes are quizical, what are tests?',
  'Test, test, is this thing on?',
  'test (n): a cricial examination, observation, or evaluation.',
  "Yup, I'm still here.",
  'Question 1: If an electron has a mass, does that mean it is Catholic?',
  'toast',
  'test(1) check file types and compare values',
];

module.exports.commands = ['test2', 'test3', /(t+)test/];
module.exports.run = function (remainder, parts, reply, command, from, to, text, raw, regex) {
  if (typeof regex === 'undefined') {
    reply(testOutputs[Math.floor(Math.random() * testOutputs.length)]);
  } else {
    reply('One of my test regex commands was called!', 'In fact it was', regex, 'which matched', command);
  }
};

module.exports.runTest4 = function (r, p, reply) {
  reply('I was called with test4');
};
module.exports.runTest5 = function (r, p, reply) {
  reply('My parts are:', p.join(', '));
};
module.exports.run_test6 = function (r, p, reply) {
  reply(`My name is ${this.name}`);
};

module.exports.run_testspam = function (r, p, reply) {
  reply('foo\nbar\nbaz');
};

module.exports.run_testscrollback = function (r, p, reply, command, from, to) {
  const scrollbackModule = this.modules['sirc-scrollback'];

  scrollbackModule.getFormattedScrollbackLinesFromRanges(to, r, (err, res) => {
    reply(err, JSON.stringify(res));
  });
};
