var assert = require('chai').assert;
var util = require('util');
var sinon = require('sinon');

var bot = require('./bot.js');

function mockClient() {
  return {
    say: sinon.spy(),
    maxLineLength: 500,
    opt: {
      messageSplit: 400,
    },
  };
}

describe('bot.getReply', function() {
  it('should work for regular looking stuff', function() {
    var tests = [
      [["foo"], "foo"],
      [[true], "true"],
      [[1], "1"],
      [["x".repeat(500)], "x".repeat(500)], // line splitting happens a layer below, we gucci
      [["x\ny"], "x\ny"], // line splitting happens a layer below, we gucci
    ];

    for(var i=0; i < tests.length; i++) {
      bot.client = mockClient();

      var reply = bot.getReply("#foo", false, "jim");
      reply.apply(bot, tests[i][0]);

      var s = bot.client.say;

      assert.isTrue(s.called, "say not called");
      assert.isTrue(s.calledOnce, "say called too many times: " + JSON.stringify(s.getCalls()));
      assert.isTrue(s.calledWith("#foo", tests[i][1]), "wrong args. Expected #foo " + tests[i][1] + ", got " + util.inspect(s.getCall(0).args));
    }
  });

  it('should handle overflow', function() {
    var tests = [
      [["x\ny\nz"], "x\ny ..."],
      [["x".repeat(2000)], "x".repeat((bot.client.opt.messageSplit * 2) - 4) + " ..."],
    ];

    for(var i=0; i < tests.length; i++) {
      bot.client = mockClient();

      var reply = bot.getReply("#foo", false, "jim");
      reply.apply(bot, tests[i][0]);

      var s = bot.client.say;

      assert.isTrue(s.called, "say not called");
      assert.isTrue(s.calledOnce, "say called too many times: " + JSON.stringify(s.getCalls()));
      assert.isTrue(s.calledWith("#foo", tests[i][1]), "wrong args. Expected #foo " + tests[i][1] + ", got " + util.inspect(s.getCall(0).args));
    }
  });
});
