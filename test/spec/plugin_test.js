'use strict';

const assert = require('assert');
const { remote } = require('webdriverio');
const { WebdriverAjax } = require('../../index');

describe('webdriverajax', function testSuite() {
  this.timeout(process.env.CI ? 100000 : 10000);

  const wait = process.env.CI ? 10000 : 1000;

  it('sets up the interceptor', () => {
    assert.equal(typeof browser.setupInterceptor, 'function');
    browser.url('/get.html');
    browser.setupInterceptor();
    const ret = browser.execute(() => {
      return window.__webdriverajax;
    });
    assert.deepEqual(ret, { requests: [] });
  });

  it('sets up the interceptor in standalone mode', async () => {
    const browser = await remote({
      port: 9515,
      path: '/',
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['--headless'],
        },
      },
    });

    const webdriverAjax = new WebdriverAjax();
    webdriverAjax.before(null, null, browser);

    assert.equal(typeof browser.setupInterceptor, 'function');
  });

  it('should reset expectations', () => {
    assert.equal(typeof browser.setupInterceptor, 'function');
    browser.url('/get.html');
    browser.setupInterceptor();
    browser.expectRequest('GET', '/get.json', 200);
    browser.expectRequest('GET', '/get.json', 200);
    assert.equal(browser.getExpectations().length, 2);
    browser.resetExpectations();
    assert.equal(browser.getExpectations().length, 0);
  });

  describe('XHR API', () => {
    it('can intercept a simple GET request', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      $('#button').click();
      browser.pause(wait);
      browser.assertRequests();
      browser.assertExpectedRequestsOnly();
    });

    it('can use regular expressions for urls', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', /get\.json/, 200);
      $('#button').click();
      browser.pause(wait);
      browser.assertRequests();
      browser.assertExpectedRequestsOnly();
    });

    it('errors on wrong request count', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      browser.expectRequest('GET', '/get.json', 200);
      $('#button').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertRequests();
      }, /Expected/);
    });

    it('errors on wrong method', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('PUT', '/get.json', 200);
      $('#button').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertRequests();
      }, /PUT/);
    });

    it('errors on wrong URL', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/wrong.json', 200);
      $('#button').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertRequests();
      }, /wrong\.json/);
    });

    it("errors if regex doesn't match URL", () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', /wrong\.json/, 200);
      $('#button').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertRequests();
      }, /get\.json/);
    });

    it('errors on wrong status code', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 404);
      $('#button').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertRequests();
      }, /404/);
    });

    it('can access a certain request', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      $('#button').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.method, 'GET');
      assert.equal(request.url, '/get.json');
      assert.deepEqual(request.response.body, { OK: true });
      assert.equal(request.response.statusCode, 200);
      assert.equal(request.response.headers['content-length'], '15');
    });

    it('can get multiple requests at once', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      $('#button').click();
      browser.pause(wait);
      $('#button').click();
      browser.pause(wait);
      const requests = browser.getRequests();
      assert(Array.isArray(requests));
      assert.equal(requests.length, 2);
      assert.equal(requests[0].method, 'GET');
      assert.equal(requests[1].method, 'GET');
    });

    it('can get multiple request one by one', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      $('#button').click();
      browser.pause(wait);
      $('#button').click();
      browser.pause(wait);
      const firstRequest = browser.getRequest(0);
      assert.equal(firstRequest.method, 'GET');
      const secondRequest = browser.getRequest(1);
      assert.equal(secondRequest.method, 'GET');
    });

    it('survives page changes', () => {
      browser.url('/page_change.html');
      browser.setupInterceptor();
      $('#button1').click();
      browser.pause(wait);
      const requests = browser.getRequests();
      assert(Array.isArray(requests));
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, 'GET');
    });

    it('survives page changes using multiple requests', () => {
      browser.url('/page_change.html');
      browser.setupInterceptor();
      $('#button1').click();
      $('#button2').click();
      browser.pause(wait);
      const requests = browser.getRequests();
      assert(Array.isArray(requests));
      assert.equal(requests.length, 2);
      assert.equal(requests[0].method, 'GET');
      assert.equal(requests[1].method, 'GET');
    });

    it('can assess the request body using string data', () => {
      browser.url('/post.html');
      browser.setupInterceptor();
      $('#buttonstring').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.body, 'foobar');
    });

    it('can assess the request body using JSON data', () => {
      browser.url('/post.html');
      browser.setupInterceptor();
      $('#buttonjson').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.headers['content-type'], 'application/json');
      assert.deepEqual(request.body, { foo: 'bar' });
    });

    it('can assess the request body using form data', () => {
      browser.url('/post.html');
      browser.setupInterceptor();
      $('#buttonform').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.deepEqual(request.body, { foo: ['bar'] });
    });

    it('can get initialised inside an iframe', () => {
      browser.url('/frame.html');
      browser.setupInterceptor();
      const ret = browser.execute(function checkSetup() {
        return window.__webdriverajax;
      });
      assert.deepEqual(ret, { requests: [] });
      $('#getinframe').waitForExist();
      browser.switchToFrame($('#getinframe'));
      browser.setupInterceptor();
      const frameRet = browser.execute(function checkSetup() {
        return window.__webdriverajax;
      });
      assert.deepEqual(frameRet, { requests: [] });
      browser.expectRequest('GET', '/get.json', 200);
      $('#button').click();
      browser.pause(wait);
      browser.assertRequests();
      browser.assertExpectedRequestsOnly();
    });

    it('errors with no requests set up', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      assert.throws(() => {
        browser.assertRequests();
      }, /No\sexpectations\sfound/);
    });

    it('returns an empty array for no captured requests', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      const count = browser.getRequests();
      assert.deepEqual(count, []);
    });

    it('can validate only the expected requests, in order (implicit)', () => {
      browser.url('/multiple_methods.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      browser.expectRequest('POST', '/post.json', 200);
      $('#getbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      // The next two are not needed, but adding extra clicks to prove we can validate partial set
      $('#getbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      browser.assertExpectedRequestsOnly();
      assert.throws(() => {
        browser.assertRequests();
      }, /Expected\s\d\srequests\sbut\swas\s\d/);
    });

    it('can validate only the expected requests, in order (explicit)', () => {
      browser.url('/multiple_methods.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      browser.expectRequest('POST', '/post.json', 200);
      $('#getbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      // The next two are not needed, but adding extra clicks to prove we can validate partial set
      $('#getbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      browser.assertExpectedRequestsOnly(true);
      assert.throws(() => {
        browser.assertRequests();
      }, /Expected\s\d\srequests\sbut\swas\s\d/);
    });

    it('can validate only the expected requests, in any order', () => {
      browser.url('/multiple_methods.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      browser.expectRequest('POST', '/post.json', 200);
      $('#postbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      $('#getbutton').click();
      browser.pause(wait);
      $('#getbutton').click();
      browser.pause(wait);
      browser.assertExpectedRequestsOnly(false);
      assert.throws(() => {
        browser.assertRequests();
      }, /Expected\s\d\srequests\sbut\swas\s\d/);
    });

    it('can validate only the expected requests, in any order, and fail when urls do not match', () => {
      browser.url('/multiple_methods.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      browser.expectRequest('POST', '/invalid.json', 200);
      $('#getbutton').click();
      browser.pause(wait);
      $('#postbutton').click();
      browser.pause(wait);
      assert.throws(() => {
        browser.assertExpectedRequestsOnly(false);
      }, /Expected request was not found. method: POST url: \/invalid.json statusCode: 200/);
    });
  });

  describe('fetch API', () => {
    it('can intercept a simple GET request', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      browser.expectRequest('GET', '/get.json', 200);
      $('#fetchbutton').click();
      browser.pause(wait);
      browser.assertRequests();
      browser.assertExpectedRequestsOnly();
    });

    it('can access a certain request', () => {
      browser.url('/get.html');
      browser.setupInterceptor();
      $('#fetchbutton').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.method, 'GET');
      assert.equal(request.url, '/get.json');
      assert.deepEqual(request.response.body, { OK: true });
      assert.equal(request.response.statusCode, 200);
      assert.equal(request.response.headers['content-length'], '15');
    });

    it('can assess the request body using string data', () => {
      browser.url('/postfetch.html');
      browser.setupInterceptor();
      $('#buttonstring').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.body, 'foobar');
    });

    it('can assess the request body using JSON data', () => {
      browser.url('/postfetch.html');
      browser.setupInterceptor();
      $('#buttonjson').click();
      browser.pause(wait);
      const request = browser.getRequest(0);
      assert.equal(request.headers['content-type'], 'application/json');
      assert.deepEqual(request.body, { foo: 'bar' });
    });
  });
});
