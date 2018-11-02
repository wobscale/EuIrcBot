/* eslint-env mocha */

const assert = require('chai').assert;
const sinon = require('sinon');
const onUrl = require('./onUrl.js');

function MockBot() {
  return {
    callModuleFn: sinon.spy(),
  };
}

describe('onUrl.msg', () => {
  it('should find urls', () => {
    // Test cases of the form:
    //   [inputIrcString, [list, of, urls, that, should, be, identified]]
    const testCases = [
      ['foo bar baz', []],
      ['http://example.com/', ['http://example.com/']],
      ['IANNA lanana banana http://example.com/ ', ['http://example.com/']],
      ['Punctual clocks at http://clock.town/!', ['http://clock.town/']],
      ['https://witches.town/@iliana/5147866', ['https://witches.town/@iliana/5147866']],
      ['https://oo-ee.ooo', ['https://oo-ee.ooo/']],
      ['https://oo-ee.ooo/underscore_page.html', ['https://oo-ee.ooo/underscore_page.html']],
      ['http://example.com/?url=foo/bar=baz.~+waitbeep.', ['http://example.com/?url=foo/bar=baz.~+waitbeep']],
      ['file://thank-gosh-our-security-is-good.and-this-is-fine/', ['file://thank-gosh-our-security-is-good.and-this-is-fine/']],
      ['file:///thank-gosh-our-security-is-good.and-this-is-fine/', []],
      ['http://名がドメイン.com', ['http://xn--v8jxj3d1dzdz08w.com/']],
      ['broken auth http://%@foo.bar/baz pfff', ['http://%@foo.bar/baz']],
      ['!g matthew 5:29', []],
      ['matching parens https://wikipedia.wiki/article_(open_close_parens)', ['https://wikipedia.wiki/article_(open_close_parens)']],
      ['matching parens 2 (https://wikipedia.wiki/article_(open_close_parens))', ['https://wikipedia.wiki/article_(open_close_parens)']],
      ['matching parens 3 (foo https://wikipedia.wiki/article_(open_close_parens))', ['https://wikipedia.wiki/article_(open_close_parens)']],
      ['trailing period http://example.yikes.', ['http://example.yikes/']],
      ['trailing ? http://example.yikes?', ['http://example.yikes/']],
      ['Interesting https://en.wikipedia.org/wiki/Galileo_(satellite_navigation)', ['https://en.wikipedia.org/wiki/Galileo_(satellite_navigation)']],
      ['quotes {http://1.com}, [http://2.com], «http://3.com», 「http://4.com」, 『http://5.com』, ', [1, 2, 3, 4, 5].map(i => `http://${i}.com/`)],
      ['quotes http://{1}.com, http://«2».com, http://「3」.com, http://『4』.com, ', ['http://{1}.com/', 'http://xn--2-qca3c.com/', 'http://xn--3-t4te.com/', 'http://xn--4-x4te.com/']],
    ];

    testCases.forEach((c) => {
      const mockBot = new MockBot();
      onUrl.init(mockBot);
      const spy = mockBot.callModuleFn;

      const input = c[0];
      const expectedUrls = c[1];

      onUrl.msg(input, '#from', 'reply', 'raw');

      assert.equal(
        spy.callCount,
        expectedUrls.length,
        `${input} should have ${expectedUrls.length} urls, was ${spy.callCount}`,
      );
      const foundUrls = spy.getCalls().map(call => call.args[1][0]);
      assert.deepEqual(expectedUrls, foundUrls);
    });
  });
});
