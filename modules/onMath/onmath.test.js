var onmath = require('.');
var assert = require('chai').assert;
var async = require('async');

function assertResponse(input, output, done) {
  onmath.msg(input, "#test", function(reply) {
    assert.equal(reply, output);
    done();
  }, "ignored raw");
}

function assertNoResponse(input, done) {
  onmath.msg(input, "#test", function(reply) {
    assert.fail(reply, "", "Should not have responded");
  }, "ignored raw");

  process.nextTick(done);
}

describe('onMath', function() {
  it('should do simple math', function(done) {
    var simpleMath = [
      ["1+1", "2"],
      ["1*1", "1"],
      ["not (1 == 10)", "true"],
    ];

    async.every(simpleMath, function(el, callback) {
      assertResponse(el[0], el[1], function() {
        callback(true);
      });
    }, function(err) {
      assert.isOk(err);
      done();
    });
  });
  it("should ignore dumb stuff", function(done) {
    var dumbStuff = [
      "1",
      "e",
      "E",
      "i'm g",
      "9/10",
      "10/10",
      "11/10",
      "10/100",
      "(1)",
      ".2 bytes / second",
      '3 #comment',
      '"3" #comment',
      'not 5',
      'not []',
      // "W 0 B S C A L E", // One can dream
    ];

    async.every(dumbStuff, function(el, callback) {
      assertNoResponse(el, function() { callback(true); });
    }, function(err) {
      assert.isOk(err);
      done();
    });
  });

  it("should ignore :VAR matrix expansions", function(done) {
    assertResponse("D=1", "1", function() {
      assertNoResponse(":D", done);
    });
  });

  it("should allow clearing", function(done) {
    assertResponse("x=10", "10", function() {
      assertResponse("x * 100", "1000", function() {
        onmath.run_reset("", null, function() {
          // someone think of the promises
          assertNoResponse("x * 100", done);
        });
      });
    });
  });
});
