/* eslint-env mocha */
const roll = require('.');
const assert = require('chai').assert;

describe('roll.rollDice', () => {
  it('should roll dice', () => {
    const testCases = [
      ['1d20', (x) => { assert.isTrue(x >= 1 && x <= 20); }],
      ['1d20+1', (x) => { assert.isTrue(x >= 2 && x <= 21); }],
      ['2d2', (x) => { assert.match(x, /^[2-4]: Rolled [12], [12]$/); }],
    ];

    testCases.forEach((c) => {
      roll.run(c[0], [], c[1]);
    });
  });

  it('should not roll not dice', () => {
    const testCases = [
      '123', 'a', 'ada', 'ad20', 'fruit', '', '-',
    ];
    testCases.forEach((c) => {
      roll.run(c, [], () => {
        assert.fail('should not be called');
      });
    });
  });
});
