let assert = require('chai').assert,
    sinon = require('sinon'),
    onUrl = require('./onUrl.js');

function MockBot() {
  return {
    callModuleFn: sinon.spy(),
  };
}

describe('onUrl.msg', () => {
  it('should find urls', () => {
    // Test cases of the form:
    //   [inputIrcString, [list, of, urls, that, should, be, identified]]
    let testCases = [
      ["foo bar baz", []],
      ["http://example.com/", ["http://example.com/"]],
      ["IANNA lanana banana http://example.com/ ", ["http://example.com/"]],
      ["Punctual clocks at http://clock.town/!", ["http://clock.town/"]],
      ["https://witches.town/@iliana/5147866", ["https://witches.town/@iliana/5147866"]],
      ["https://oo-ee.ooo", ["https://oo-ee.ooo/"]], // an artifact of url.parse
      ["https://oo-ee.ooo/underscore_page.html", ["https://oo-ee.ooo/underscore_page.html"]],
      ["http://example.com/?url=foo/bar=baz.~+waitbeep.", ["http://example.com/?url=foo/bar=baz.~+waitbeep"]],
      ["file://thank-gosh-our-security-is-good.and-this-is-fine/", ["file://thank-gosh-our-security-is-good.and-this-is-fine/"]],
      ["file:///thank-gosh-our-security-is-good.and-this-is-fine/", []],
      ["http://名がドメイン.com", ["http://xn--v8jxj3d1dzdz08w.com/"]],
    ];

    testCases.forEach((c) => {
      let mockBot = new MockBot();
      onUrl.init(mockBot);
      let spy = mockBot.callModuleFn;

      let input = c[0];
      let expectedUrls = c[1];

      onUrl.msg(input, "#from", "reply", "raw");

      assert.equal(spy.callCount, expectedUrls.length);
      let foundUrls = spy.getCalls().map((call) => call.args[1][0]);
      assert.deepEqual(expectedUrls, foundUrls);
    });
  });
});
