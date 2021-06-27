WebdriverIO Intercept Service
=============================

🕸 Capture and assert HTTP ajax calls in [webdriver.io](http://webdriver.io/)

[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com) [![Tests](https://github.com/webdriverio-community/wdio-intercept-service/actions/workflows/test.yaml/badge.svg)](https://github.com/webdriverio-community/wdio-intercept-service/actions/workflows/test.yaml) [![Join the chat at https://gitter.im/wdio-intercept-service/community](https://badges.gitter.im/chmanie/wdio-intercept-service.svg)](https://gitter.im/wdio-intercept-service/community)

This is a plugin for [webdriver.io](http://webdriver.io/). If you don't know it yet, check it out, it's pretty cool.

Although selenium and webdriver are used for e2e and especially UI testing, you might want to assess HTTP requests done by your client code (e.g. when you don't have immediate UI feedback, like in metrics or tracking calls). With wdio-intercept-service you can intercept ajax HTTP calls initiated by some user action (e.g. a button press, etc.) and make assertions about the request and corresponding resposes later.

There's one catch though: you can't intercept HTTP calls that are initiated on page load (like in most SPAs), as it requires some setup work that can only be done after the page is loaded (due to limitations in selenium). **That means you can just capture requests that were initiated inside a test.** If you're fine with that, this plugin might be for you, so read on.

## Prerequisites

* webdriver.io **v5.x**.

**Heads up! If you're still using webdriver.io v4, please use the v2.x branch of this plugin!**

## Installation

```
npm install wdio-intercept-service -D
```

## Usage

### Usage with WebDriver CLI

It should be as easy as adding wdio-intercept-service to your `wdio.conf.js`:

```javascript
exports.config = {
  // ...
  services: ['intercept']
  // ...
};
```

and you're all set.

### Usage with WebDriver Standalone

When using WebdriverIO Standalone, the `before` and `beforeTest` / `beforeScenario` functions need to be called manually.

```javascript
import { remote } from 'webdriverio';
import { WebdriverAjax } from 'wdio-intercept-service-main'

const WDIO_OPTIONS = {
  port: 9515,
  path: '/',
  capabilities: {
    browserName: 'chrome'
  },
}

let browser;
const interceptServiceLauncher = WebdriverAjax();

beforeAll(async () => {
  browser = await remote(WDIO_OPTIONS)
  interceptServiceLauncher.before(null, null, browser)
})

beforeEach(async () => {
  interceptServiceLauncher.beforeTest()
})

afterAll(async () => {
  await client.deleteSession()
});

describe('', async () => {
  ... // See example usage
});
```

Once initialized, some related functions are added to your browser command chain (see [API](#api)).

## Quickstart

Example usage:

```javascript
browser.url('http://foo.bar');
browser.setupInterceptor(); // capture ajax calls
browser.expectRequest('GET', '/api/foo', 200); // expect GET request to /api/foo with 200 statusCode
browser.expectRequest('POST', '/api/foo', 400); // expect POST request to /api/foo with 400 statusCode
browser.expectRequest('GET', /\/api\/foo/, 200); // can validate a URL with regex, too
browser.click('#button'); // button that initiates ajax request
browser.pause(1000); // maybe wait a bit until request is finished
browser.assertRequests(); // validate the requests
```

Get details about requests:

```javascript
browser.url('http://foo.bar')
browser.setupInterceptor();
browser.click('#button')
browser.pause(1000);

var request = browser.getRequest(0);
assert.equal(request.method, 'GET');
assert.equal(request.response.headers['content-length'], '42');
```

## Supported browsers

It should work with somewhat newer versions of all browsers. Please report an issue if it doesn't seem to work with yours.

## API

### browser.setupInterceptor()

Captures ajax calls in the browser. You always have to call the setup function in order to assess requests later.

### browser.expectRequest(method: string, url: string, statusCode: number)

Make expectations about the ajax requests that are going to be initiated during the test. Can (and should) be chained. The order of the expectations should map to the order of the requests being made.

* `method` (`String`): http method that is expected. Can be anything `xhr.open()` accepts as first argument.
* `url` (`String`|`RegExp`): exact URL that is called in the request as a string or RegExp to match
* `statusCode` (`Number`): expected status code of the response

### browser.getExpectations()

Helper method. Returns all the expectations you've made up until that point

### browser.resetExpectations()

Helper method. Resets all the expectations you've made up until that point

### browser.assertRequests()

Call this method when all expected ajax requests are finished. It compares the expectations to the actual requests made and asserts the following:

- Count of the requests that were made
- The order of the requests
- The method, the URL and the statusCode should match for every request made

### browser.assertExpectedRequestsOnly(inOrder?: boolean)

Similar to `browser.assertRequests`, but validates only the requests you specify in your `expectRequest` directives, without having to map out all the network requests that might happen around that. If `inOrder` equals to `true` (default), the requests are expected to be made in the same order as they were setup with `expectRequest`.

### browser.getRequest(index: number)

To make more sophisticated assertions about a specific request you can get details for a specific request after it is finished. You have to provide the index of the request you want to access in the order the requests were initiated (starting with 0).

* `index` (`Number`): number of the request you want to access

**Returns** `request` object:

* `request.url`: requested URL
* `request.method`: used HTTP method
* `request.body`: payload/body data used in request
* `request.headers`: request http headers as JS object
* `request.response.headers`: response http headers as JS object
* `request.response.body`: response body (will be parsed as JSON if possible)
* `request.response.statusCode`: response status code

**A note on `request.body`:** wdio-intercept-service will try to parse the request body as follows:

* string: Just return the string (`'value'`)
* JSON: Parse the JSON object using `JSON.parse()` (`({ key: value })`)
* FormData: Will output the FormData in the format `{ key: [value1, value2, ...] }`
* ArrayBuffer: Will try to convert the buffer to a string (experimental)
* Anything else: Will use a brutal `JSON.stringify()` on your data. Good luck!

**For the `fetch` API, we only support string and JSON data!**

### browser.getRequests()

Get all captured requests as an array.

**Returns** array of `request` objects.

## TypeScript support

This plugin provides its own TS types. Just point your tsconfig to the type extensions like mentioned [here](https://webdriver.io/docs/typescript.html#framework-types):

```
"compilerOptions": {
    // ..
    "types": ["node", "webdriverio", "wdio-intercept-service"]
},
```

## Running the tests

A compatible browser (Firefox, Chrome) has to be installed. Also install selenium standalone via:

```shell
node_modules/.bin/selenium-standalone install
```

then

```shell
yarn test # npm test works as well :)
```

## Contributing

I'm happy for every contribution. Just open an issue or directly file a PR.

## License

MIT
