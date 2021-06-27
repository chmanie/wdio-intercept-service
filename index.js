'use strict';

const interceptor = require('./lib/interceptor');

class WebdriverAjax {
  constructor() {
    this._wdajaxExpectations = null;
  }

  beforeTest() {
    this._wdajaxExpectations = [];
  }

  beforeScenario() {
    this._wdajaxExpectations = [];
  }

  before(config, capabilities, browser) {
    /**
     * instance need to have addCommand method
     */
    if (typeof browser.addCommand !== 'function') {
      throw new Error(
        "you can't use WebdriverAjax with this version of WebdriverIO"
      );
    }

    browser.addCommand('setupInterceptor', setup.bind(this));
    browser.addCommand('getExpectations', getExpectations.bind(this));
    browser.addCommand('resetExpectations', resetExpectations.bind(this));
    browser.addCommand('expectRequest', expectRequest.bind(this));
    browser.addCommand('assertRequests', assertRequests.bind(this));
    browser.addCommand(
      'assertExpectedRequestsOnly',
      assertExpectedRequestsOnly.bind(this)
    );
    browser.addCommand('getRequest', getRequest);
    browser.addCommand('getRequests', getRequest);

    function setup() {
      return browser.executeAsync(interceptor.setup);
    }

    function expectRequest(method, url, statusCode) {
      this._wdajaxExpectations.push({
        method: method.toUpperCase(),
        url: url,
        statusCode: statusCode
      });
      return browser;
    }

    function assertRequests() {
      const expectations = this._wdajaxExpectations;

      if (!expectations.length) {
        return Promise.reject(
          new Error('No expectations found. Call .expectRequest() first')
        );
      }
      return getRequest().then(requests => {
        if (expectations.length !== requests.length) {
          return Promise.reject(
            new Error(
              'Expected ' +
                expectations.length +
                ' requests but was ' +
                requests.length
            )
          );
        }

        for (let i = 0; i < expectations.length; i++) {
          const ex = expectations[i];
          const request = requests[i];

          if (request.method !== ex.method) {
            return Promise.reject(
              new Error(
                'Expected request to URL ' +
                  request.url +
                  ' to have method ' +
                  ex.method +
                  ' but was ' +
                  request.method
              )
            );
          }

          if (
            ex.url instanceof RegExp &&
            request.url &&
            !request.url.match(ex.url)
          ) {
            return Promise.reject(
              new Error(
                'Expected request ' +
                  i +
                  ' to match ' +
                  ex.url.toString() +
                  ' but was ' +
                  request.url
              )
            );
          }

          if (typeof ex.url == 'string' && request.url !== ex.url) {
            return Promise.reject(
              new Error(
                'Expected request ' +
                  i +
                  ' to have URL ' +
                  ex.url +
                  ' but was ' +
                  request.url
              )
            );
          }

          if (request.response.statusCode !== ex.statusCode) {
            return Promise.reject(
              new Error(
                'Expected request to URL ' +
                  request.url +
                  ' to have status ' +
                  ex.statusCode +
                  ' but was ' +
                  request.response.statusCode
              )
            );
          }
        }

        return browser;
      });
    }

    function assertExpectedRequestsOnly(inOrder = true) {
      const expectations = this._wdajaxExpectations;

      return getRequest().then(requests => {
        const clonedRequests = [...requests];

        let matchedRequestIndexes = [];
        for (let i = 0; i < expectations.length; i++) {
          const ex = expectations[i];

          const matchingRequestIndex = clonedRequests.findIndex(request => {
            if (
              !request ||
              request.method !== ex.method ||
              (ex.url instanceof RegExp &&
                request.url &&
                !request.url.match(ex.url)) ||
              (typeof ex.url == 'string' && request.url !== ex.url) ||
              request.response.statusCode !== ex.statusCode
            ) {
              return false;
            }

            return true;
          });

          if (matchingRequestIndex !== -1) {
            matchedRequestIndexes.push(matchingRequestIndex);
            delete clonedRequests[matchingRequestIndex];
          } else {
            return Promise.reject(
              new Error(
                'Expected request was not found. ' +
                  'method: ' +
                  ex.method +
                  ' url: ' +
                  ex.url +
                  ' statusCode: ' +
                  ex.statusCode
              )
            );
          }
        }

        if (matchedRequestIndexes.length !== expectations.length) {
          return Promise.reject(
            new Error(
              'Expected ' +
                expectations.length +
                ' requests but found ' +
                matchedRequestIndexes.length +
                ' matching requests'
            )
          );
        } else if (
          inOrder &&
          JSON.stringify(matchedRequestIndexes) !==
            JSON.stringify(matchedRequestIndexes.concat().sort())
        ) {
          return Promise.reject(
            new Error('Requests not received in the expected order')
          );
        }

        return browser;
      });
    }

    // In a long test, it's possible you might want to reset the list
    // of expected requests after validating some.
    function resetExpectations() {
      this._wdajaxExpectations = [];
      return browser;
    }

    function getExpectations() {
      return this._wdajaxExpectations;
    }

    async function getRequest(index) {
      let request;
      if (index > -1) {
        request = await browser.execute(interceptor.getRequest, index);
      } else {
        request = await browser.execute(interceptor.getRequest);
      }
      if (!request) {
        if (index != null) {
          return Promise.reject(
            new Error('Could not find request with index ' + index)
          );
        }
        return [];
      }
      if (Array.isArray(request)) {
        return request.map(transformRequest);
      }
      // The edge driver does not seem to typecast arrays correctly
      if (typeof request[0] == 'object') {
        return mapIndexed(request, transformRequest);
      }
      return transformRequest(request);
    }

    function transformRequest(req) {
      if (!req) {
        return;
      }

      return {
        url: req.url,
        method: req.method && req.method.toUpperCase(),
        body: parseBody(req.requestBody),
        headers: normalizeRequestHeaders(req.requestHeaders),
        response: {
          headers: parseResponseHeaders(req.headers),
          body: parseBody(req.body),
          statusCode: req.statusCode
        }
      };
    }

    function normalizeRequestHeaders(headers) {
      const normalized = {};
      Object.keys(headers).forEach(key => {
        normalized[key.toLowerCase()] = headers[key];
      });
      return normalized;
    }

    function parseResponseHeaders(stringOrObject) {
      if (typeof stringOrObject == 'object') {
        return stringOrObject;
      }
      const headers = {};
      const arr = stringOrObject
        .trim()
        .replace(/\r/g, '')
        .split('\n');
      arr.forEach(header => {
        const match = header.match(/^(.+)?:\s?(.+)$/);
        if (match) {
          headers[match[1].toLowerCase()] = match[2];
        }
      });
      return headers;
    }

    function parseBody(str) {
      let body;
      try {
        body = JSON.parse(str);
      } catch (e) {
        body = str;
      }
      return body;
    }

    // maps an 'array-like' object. returns proper array
    function mapIndexed(obj, fn) {
      const arr = [];
      const max = Math.max.apply(Math, Object.keys(obj).map(Number));
      for (let i = 0; i <= max; i++) {
        arr.push(fn(obj[i], i));
      }
      return arr;
    }
  }
}

exports.default = WebdriverAjax;
exports.WebdriverAjax = WebdriverAjax;