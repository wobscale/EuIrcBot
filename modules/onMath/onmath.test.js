const onmath = require('.');
const assert = require('chai').assert;
const async = require('async');

function assertResponse(input, output, done) {
  onmath.msg(input, '#test', (reply) => {
    assert.equal(reply, output);
    done();
  }, 'ignored raw');
}

function assertNoResponse(input, done) {
  onmath.msg(input, '#test', (reply) => {
    assert.fail(reply, '', 'Should not have responded');
  }, 'ignored raw');

  process.nextTick(done);
}

describe('onMath', () => {
  it('should do simple math', (done) => {
    const simpleMath = [
      ['1+1', '2'],
      ['1*1', '1'],
      ['not (1 == 10)', 'true'],
    ];

    async.every(simpleMath, (el, callback) => {
      assertResponse(el[0], el[1], () => {
        callback(true);
      });
    }, (err) => {
      assert.isOk(err);
      done();
    });
  });
  it('should ignore dumb stuff', (done) => {
    const dumbStuff = [
      '1',
      'e',
      'E',
      "i'm g",
      '9/10',
      '10/10',
      '11/10',
      '10/100',
      '(1)',
      '.2 bytes / second',
      '3 #comment',
      '"3" #comment',
      'not 5',
      'not []',
      // "W 0 B S C A L E", // One can dream
    ];

    async.every(dumbStuff, (el, callback) => {
      assertNoResponse(el, () => { callback(true); });
    }, (err) => {
      assert.isOk(err);
      done();
    });
  });

  it('should ignore :VAR matrix expansions', (done) => {
    assertResponse('D=1', '1', () => {
      assertNoResponse(':D', done);
    });
  });

  it('should allow clearing', (done) => {
    assertResponse('x=10', '10', () => {
      assertResponse('x * 100', '1000', () => {
        onmath.run_reset('', null, () => {
          // someone think of the promises
          assertNoResponse('x * 100', done);
        });
      });
    });
  });
});
