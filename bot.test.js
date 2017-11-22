const assert = require('chai').assert;
const util = require('util');
const sinon = require('sinon');

const bot = require('./bot.js');

function mockClient() {
  return {
    say: sinon.spy(),
    maxLineLength: 500,
    opt: {
      messageSplit: 400,
    },
  };
}

describe('bot.getReply', () => {
  it('should work for regular looking stuff', () => {
    const tests = [
      [['foo'], 'foo'],
      [[true], 'true'],
      [[1], '1'],
      [['x'.repeat(500)], 'x'.repeat(500)], // line splitting happens a layer below, we gucci
      [['x\ny'], 'x\ny'], // line splitting happens a layer below, we gucci
    ];

    for (let i = 0; i < tests.length; i++) {
      bot.client = mockClient();

      const reply = bot.getReply('#foo', false, 'jim');
      reply.apply(bot, tests[i][0]);

      const s = bot.client.say;

      assert.isTrue(s.called, 'say not called');
      assert.isTrue(s.calledOnce, `say called too many times: ${JSON.stringify(s.getCalls())}`);
      assert.isTrue(s.calledWith('#foo', tests[i][1]), `wrong args. Expected #foo ${tests[i][1]}, got ${util.inspect(s.getCall(0).args)}`);
    }
  });

  it('should handle overflow', () => {
    const tests = [
      [['x\ny\nz'], 'x\ny ...'],
      [['x'.repeat(2000)], `${'x'.repeat((bot.client.opt.messageSplit * 2) - 4)} ...`],
    ];

    for (let i = 0; i < tests.length; i++) {
      bot.client = mockClient();

      const reply = bot.getReply('#foo', false, 'jim');
      reply.apply(bot, tests[i][0]);

      const s = bot.client.say;

      assert.isTrue(s.called, 'say not called');
      assert.isTrue(s.calledOnce, `say called too many times: ${JSON.stringify(s.getCalls())}`);
      assert.isTrue(s.calledWith('#foo', tests[i][1]), `wrong args. Expected #foo ${tests[i][1]}, got ${util.inspect(s.getCall(0).args)}`);
    }
  });


  it('should spam with reply.spam', () => {
    const tests = [
      [['x\ny\nz\nalpha'], 'x\ny\nz\nalpha'],
      [['x'.repeat(2000)], 'x'.repeat(2000)],
    ];

    for (let i = 0; i < tests.length; i++) {
      bot.client = mockClient();

      const reply = bot.getReply('#foo', false, 'holden');
      reply.spam.apply(bot, tests[i][0]);

      const s = bot.client.say;

      assert.isTrue(s.called, 'say not called');
      assert.isTrue(s.calledOnce, `say called too many times: ${JSON.stringify(s.getCalls())}`);
      assert.isTrue(s.calledWith('#foo', tests[i][1]), `wrong args. Expected #foo ${tests[i][1]}, got ${util.inspect(s.getCall(0).args)}`);
    }
  });

  it('should spam by default in pm', () => {
    const tests = [
      [['x\ny\nz\nalpha'], 'x\ny\nz\nalpha'],
      [['x'.repeat(2000)], 'x'.repeat(2000)],
    ];

    for (let i = 0; i < tests.length; i++) {
      bot.client = mockClient();

      const reply = bot.getReply('timmy', true, 'timmy');
      reply.apply(bot, tests[i][0]);

      const s = bot.client.say;

      assert.isTrue(s.called, 'say not called');
      assert.isTrue(s.calledOnce, `say called too many times: ${JSON.stringify(s.getCalls())}`);
      assert.isTrue(s.calledWith('timmy', tests[i][1]), `wrong args. Expected #foo ${tests[i][1]}, got ${util.inspect(s.getCall(0).args)}`);
    }
  });

  it('should work with reply.custom', () => {
    const tests = [
      {
        // defaulting
        opts: {},
        input: [' foo bar baz '],
        output: 'foo bar baz',
        pmOutput: null,
      },
      {
        opts: {
          trim: false,
        },
        input: [' foo bar baz '],
        output: ' foo bar baz ',
        pmOutput: null,
      },
      {
        opts: {
          lines: 5,
        },
        input: ['SAY\nWHAT\nONE\nMORE\nTIME'],
        output: 'SAY\nWHAT\nONE\nMORE\nTIME',
        pmOutput: null,
      },
      {
        opts: {
          lines: 5,
        },
        input: ['SAY\nWHAT\nONE\nMORE\nTIME\nI\nDARE\nYOU'],
        output: 'SAY\nWHAT\nONE\nMORE\nTIME ...',
        pmOutput: null,
      },
      {
        opts: {
          replaceNewlines: true,
        },
        input: ['SAY\nWHAT\nONE\nMORE\nTIME\nI\nDARE\nYOU'],
        output: 'SAY | WHAT | ONE | MORE | TIME | I | DARE | YOU',
        pmOutput: null,
      },
      {
        opts: {
          lines: 1,
          pmExtra: true,
        },
        input: ['SAY\nWHAT'],
        output: 'SAY ...',
        pmOutput: 'SAY\nWHAT',
      },
      {
        opts: {
          lines: 1,
          replaceNewlines: true,
          pmExtra: true,
        },
        input: [`${'x'.repeat('350')}\n${'x'.repeat('350')}`],
        output: `${'x'.repeat('350')} | ${'x'.repeat(400 - 350 - 3 - 4)} ...`,
        pmOutput: `${'x'.repeat('350')}\n${'x'.repeat('350')}`,
      },
    ];

    for (const test of tests) {
      bot.client = mockClient();
      const reply = bot.getReply('#beep', false, 'timmy');
      reply.custom(test.opts, ...test.input);

      const s = bot.client.say;
      assert.isTrue(s.called, 'say not called');
      const calledTimes = test.pmOutput ? 2 : 1;
      assert.equal(s.getCalls().length, calledTimes);

      assert.isTrue(
        s.calledWith('#beep', test.output),
        `wrong args. Expected #beep ${test.output}, got ${util.inspect(s.getCall(0).args)}`,
      );

      if (test.pmOutput) {
        assert.isTrue(
          s.calledWith('timmy', test.pmOutput),
          `wrong args. Expected #beep ${test.output}, got ${util.inspect(s.getCall(1).args)}`,
        );
      }
    }
  });
});
