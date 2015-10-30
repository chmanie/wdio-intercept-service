'use strict';

var interceptor = require('./lib/interceptor');

function plugin (wdInstance, options) {

    /**
     * instance need to have addCommand method
     */
    if(typeof wdInstance.addCommand !== 'function') {
        throw new Error('you can\'t use WebdriverAjax with this version of WebdriverIO');
    }

    wdInstance.addCommand('setupInterceptor', setup.bind(wdInstance));
    wdInstance.addCommand('expectRequest', expectRequest.bind(wdInstance));
    wdInstance.addCommand('assertRequests', assertRequests.bind(wdInstance));
    wdInstance.addCommand('getRequest', getRequest.bind(wdInstance));
    wdInstance.addCommand('getRequests', getRequest.bind(wdInstance));

    function setup () {
        wdInstance.__wdajaxExpectations = [];
        return wdInstance.execute(interceptor.setup);
    }

    function expectRequest (method, url, status) {
        wdInstance.__wdajaxExpectations.push({
            method: method.toUpperCase(),
            url: url,
            status: status
        });
    }

    function assertRequests () {

        return getRequest().then(function assertAllRequests (requests) {

            var expectations = wdInstance.__wdajaxExpectations;

            if (expectations.length !== requests.length) {
                return Promise.reject(new Error(
                    'Expected ' +
                    expectations.length +
                    ' requests but was ' +
                    requests.length
                ));
            }

            for (var i = 0; i < expectations.length; i++) {
                var ex = expectations[i];
                var request = requests[i];

                if (request.method !== ex.method) {
                    return Promise.reject(new Error(
                        'Expected request to URL ' +
                        request.url +
                        ' to have method ' +
                        ex.method +
                        ' but was ' + request.method
                    ));
                }

                if (ex.url instanceof RegExp && request.url && !request.url.match(ex.url)) {
                    return Promise.reject(new Error(
                        'Expected request ' +
                        i +
                        ' to match '
                        + ex.url.toString() +
                        ' but was ' +
                        request.url
                    ));
                }

                if (typeof ex.url == 'string' && request.url !== ex.url) {
                    return Promise.reject(new Error(
                        'Expected request ' +
                        i +
                        ' to have URL '
                        + ex.url +
                        ' but was ' +
                        request.url
                    ));
                }

                if (request.response.status !== ex.status) {
                    return Promise.reject(new Error(
                        'Expected request to URL ' +
                        request.url +
                        ' to have status ' +
                        ex.status +
                        ' but was ' +
                        request.response.status
                    ));
                }

            }

            return wdInstance;

        });

    }

    function getRequest (index) {
        return wdInstance.execute(interceptor.getRequest, index)
            .then(function (request) {
                if (!request.value) {
                    return Promise.reject(new Error('Could not find request with index ' + index));
                }
                if (Array.isArray(request.value)) {
                    return request.value.map(transformRequest);
                }
                return transformRequest(request.value);
            });
    }

    function transformRequest (req) {
        if (!req) {
            return;
        }
        return {
            url: req.url,
            method: req.method,
            response: {
                headers: parseHeaders(req.headers),
                body: parseBody(req.body),
                status: req.status
            }
        };
    }

    function parseHeaders (str) {
        var headers = {};
        var arr = str.trim().replace(/\r/g, '').split('\n');
        arr.forEach(function (header) {
            var match = header.match(/^(.+)?\:\s?(.+)$/);
            if (match) {
                headers[match[1].toLowerCase()] = match[2];
            }
        });
        return headers;
    }

    function parseBody (str) {
        var body;
        try {
            body = JSON.parse(str);
        } catch(e) {
            body = str;
        }
        return body;
    }

}

/**
 * expose WebdriverAjax
 */
module.exports.init = plugin;