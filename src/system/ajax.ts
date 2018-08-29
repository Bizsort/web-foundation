import { Action, Action2 } from '../system'

export interface RequestOptions {
    url: string;
    method?: string;
    headers?: Object;
    body?;
    async?: boolean;
    handleAs?: string;
    jsonPrefix?: string;
    withCredentials?: boolean;
    timeout?: number;
}

//iron-ajax.html
export class IronAjaxElement {
    /**
    * If true, error messages will automatically be logged to the console.
    */
    verbose = false;

    /**
        * The most recent request made by this iron-ajax element.
        */
    lastRequest;
    _setLastRequest(lastRequest) {
        this.lastRequest = lastRequest;
    };

    /**
        * True while lastRequest is in flight.
        */
    loading;
    _setLoading(loading) {
        this.loading = loading;
    };

    /**
        * lastRequest's response.
        *
        * Note that lastResponse and lastError are set when lastRequest finishes,
        * so if loading is true, then lastResponse and lastError will correspond
        * to the result of the previous request.
        *
        * The type of the response is determined by the value of `handleAs` at
        * the time that the request was generated.
        *
        * @type {Object}
        */
    lastResponse;
    _setLastResponse(lastResponse) {
        this.lastResponse = lastResponse;
    };

    /**
        * lastRequest's error, if any.
        *
        * @type {Object}
        */
    lastError;
    _setLastError(lastError) {
        this.lastError = lastError;
    };

    /**
        * An Array of all in-flight requests originating from this iron-ajax
        * element.
        */
    activeRequests = [];

    /**
        * Prefix to be stripped from a JSON response before parsing it.
        *
        * In order to prevent an attack using CSRF with Array responses
        * (http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/)
        * many backends will mitigate this by prefixing all JSON response bodies
        * with a string that would be nonsensical to a JavaScript parser.
        *
        */
    jsonPrefix = '';

    _boundHandleResponse;
    constructor() {
        this._boundHandleResponse = this._handleResponse.bind(this);
    }

    /**
    * Performs an AJAX request to the specified URL.
    *
    * @return {!IronRequestElement}
    */
    generateRequest(requestOptions: RequestOptions, callback: Action<any>, faultCallback: Action2<IronRequestElement, any>) {
        var request = <IronRequestElement>document.createElement('iron-request');
        //var request = new IronRequestElement();
        //VH
        request.callback = callback;
        request.faultCallback = faultCallback;
        this.activeRequests.push(request);

        request.completes.then(
            this._boundHandleResponse
        ).catch(
            this._handleError.bind(this, request)
            ).then(
            this._discardRequest.bind(this, request)
            );

        request.send(requestOptions);

        this._setLastRequest(request);
        this._setLoading(true);

        /*this.fire('request'...);
        this.fire('iron-ajax-request'...);*/

        return request;
    };

    _handleResponse(request) {
        if (request === this.lastRequest) {
            this._setLastResponse(request.response);
            this._setLastError(null);
            this._setLoading(false);
        }
        request.callback(request.response); //VH
        /*this.fire('response'...);
        this.fire('iron-ajax-response'...);*/
    };

    _handleError(request, error) {
        /*if (this.verbose) {
            Polymer.Base._error(error);
        }*/

        if (request === this.lastRequest) {
            this._setLastError({
                request: request,
                error: error,
                status: request.xhr.status,
                statusText: request.xhr.statusText,
                response: request.xhr.response
            });
            this._setLastResponse(null);
            this._setLoading(false);
        }
        request.faultCallback(request, error); //VH
        // Tests fail if this goes after the normal this.fire('error', ...)
        /*this.fire('iron-ajax-error'...);
        this.fire('error'...);*/
    };

    _discardRequest(request) {
        var requestIndex = this.activeRequests.indexOf(request);

        if (requestIndex > -1) {
            this.activeRequests.splice(requestIndex, 1);
        }
    };

    /*_requestOptionsChanged () {
        ...
    }*/
}

interface _XMLHttpRequest extends XMLHttpRequest {
    _responseType: string;
    _jsonPrefix: string;
}

//iron-request.html
export interface IronRequestElement extends HTMLElement {
    completes;
    send;
    status: Number;
    callback;
    faultCallback;
}

//export class IronRequestElement {
//    /**
//     * A reference to the XMLHttpRequest instance used to generate the
//     * network request.
//     *
//     * @type {XMLHttpRequest}
//     */
//    xhr: _XMLHttpRequest;

//    /**
//     * A reference to the parsed response body, if the `xhr` has completely
//     * resolved.
//     *
//     * @type {*}
//     * @default null
//     */
//    response: Object = null;
//    _setResponse(response: Object) {
//        this.response = response;
//    }

//    /**
//     * A reference to the status code, if the `xhr` has completely resolved.
//     */
//    status: number = 0;
//    _setStatus(status: number) {
//        this.status = status;
//    }

//    /**
//     * A reference to the status text, if the `xhr` has completely resolved.
//     */
//    statusText: string = '';
//    _setStatusText(statusText: string) {
//        this.statusText = statusText;
//    }

//    /**
//     * A promise that resolves when the `xhr` response comes back, or rejects
//     * if there is an error before the `xhr` completes.
//     *
//     * @type {Promise}
//     */
//    completes; //Object

//    /**
//     * An object that contains progress information emitted by the XHR if
//     * available.
//     *
//     * @default {}
//     */
//    progress: Object = {};
//    _setProgress(progress: Object) {
//        this.progress = progress;
//    }

//    /**
//     * Aborted will be true if an abort of the request is attempted.
//     */
//    aborted: boolean = false;
//    _setAborted(aborted: boolean) {
//        this.aborted = aborted;
//    }

//    /**
//     * Errored will be true if the browser fired an error event from the
//     * XHR object (mainly network errors).
//     */
//    errored: boolean = false;
//    _setErrored(errored: boolean) {
//        this.errored = errored;
//    }

//    /**
//     * TimedOut will be true if the XHR threw a timeout event.
//     */
//    timedOut: boolean = false;
//    _setTimedOut(timedOut: boolean) {
//        this.timedOut = timedOut;
//    }

//    resolveCompletes;
//    rejectCompletes;
//    callback: Action<any>;
//    faultCallback: Action2<IronRequestElement, any>;

//    constructor() {
//        this.xhr = <_XMLHttpRequest>new XMLHttpRequest();
//        this.completes = new Promise(function (resolve, reject) {
//            this.resolveCompletes = resolve;
//            this.rejectCompletes = reject;
//        }.bind(this));
//    }

//    /**
//     * Succeeded is true if the request succeeded. The request succeeded if it
//     * loaded without error, wasn't aborted, and the status code is ≥ 200, and
//     * < 300, or if the status code is 0.
//     *
//     * The status code 0 is accepted as a success because some schemes - e.g.
//     * file:// - don't provide status codes.
//     *
//     * @return {boolean}
//     */
//    get succeeded() {
//        if (this.errored || this.aborted || this.timedOut) {
//            return false;
//        }
//        var status = this.xhr.status || 0;

//        // Note: if we are using the file:// protocol, the status code will be 0
//        // for all outcomes (successful or otherwise).
//        return status === 0 ||
//            (status >= 200 && status < 300);
//    }

//    /**
//     * Sends an HTTP request to the server and returns the XHR object.
//     *
//     * The handling of the `body` parameter will vary based on the Content-Type
//     * header. See the docs for iron-ajax's `body` param for details.
//     *
//     * @param {{
//     *   url: string,
//     *   method: (string|undefined),
//     *   async: (boolean|undefined),
//     *   body: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object),
//     *   headers: (Object|undefined),
//     *   handleAs: (string|undefined),
//     *   jsonPrefix: (string|undefined),
//     *   withCredentials: (boolean|undefined)}} options -
//     *     url The url to which the request is sent.
//     *     method The HTTP method to use, default is GET.
//     *     async By default, all requests are sent asynchronously. To send synchronous requests,
//     *         set to false.
//     *     body The content for the request body for POST method.
//     *     headers HTTP request headers.
//     *     handleAs The response type. Default is 'text'.
//     *     withCredentials Whether or not to send credentials on the request. Default is false.
//     *   timeout: (Number|undefined)
//     * @return {Promise}
//     */
//    send(options: RequestOptions) {
//        var xhr = this.xhr;

//        if (xhr.readyState > 0) {
//            return null;
//        }

//        xhr.addEventListener('progress', function (progress) {
//            this._setProgress({
//                lengthComputable: progress.lengthComputable,
//                loaded: progress.loaded,
//                total: progress.total
//            });
//        }.bind(this))

//        xhr.addEventListener('error', function (error) {
//            this._setErrored(true);
//            this._updateStatus();
//            this.rejectCompletes(error);
//        }.bind(this));

//        xhr.addEventListener('timeout', function (error) {
//            this._setTimedOut(true);
//            this._updateStatus();
//            this.rejectCompletes(error);
//        }.bind(this));

//        xhr.addEventListener('abort', function () {
//            this._updateStatus();
//            this.rejectCompletes(new Error('Request aborted.'));
//        }.bind(this));

//        // Called after all of the above.
//        xhr.addEventListener('loadend', function () {
//            this._updateStatus();
//            this._setResponse(this.parseResponse());

//            if (!this.succeeded) {
//                this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
//                return;
//            }

//            this.resolveCompletes(this);
//        }.bind(this));

//        //this.url = options.url;
//        xhr.open(
//            options.method || 'GET',
//            options.url,
//            options.async !== false
//        );

//        var acceptType = {
//            'json': 'application/json',
//            'text': 'text/plain',
//            'html': 'text/html',
//            'xml': 'application/xml',
//            'arraybuffer': 'application/octet-stream'
//        }[options.handleAs];
//        var headers = options.headers || Object.create(null);
//        var newHeaders = Object.create(null);
//        for (var key in headers) {
//            newHeaders[key.toLowerCase()] = headers[key];
//        }
//        headers = newHeaders;

//        if (acceptType && !headers['accept']) {
//            headers['accept'] = acceptType;
//        }
//        Object.keys(headers).forEach(function (requestHeader) {
//            if (/[A-Z]/.test(requestHeader)) {
//                Polymer.Base._error('Headers must be lower case, got', requestHeader);
//            }
//            xhr.setRequestHeader(
//                requestHeader,
//                headers[requestHeader]
//            );
//        }, this);

//        if (options.async !== false) {
//            if (options.async) {
//                xhr.timeout = options.timeout;
//            }

//            var handleAs = options.handleAs;

//            // If a JSON prefix is present, the responseType must be 'text' or the
//            // browser won’t be able to parse the response.
//            if (!!options.jsonPrefix || !handleAs) {
//                handleAs = 'text';
//            }

//            // In IE, `xhr.responseType` is an empty string when the response
//            // returns. Hence, caching it as `xhr._responseType`.
//            xhr.responseType = <XMLHttpRequestResponseType>(xhr._responseType = handleAs);

//            // Cache the JSON prefix, if it exists.
//            if (!!options.jsonPrefix) {
//                xhr._jsonPrefix = options.jsonPrefix;
//            }
//        }

//        xhr.withCredentials = !!options.withCredentials;

//        var body = this._encodeBodyObject(options.body, headers['content-type']);

//        xhr.send(
//            /** @type {ArrayBuffer|ArrayBufferView|Blob|Document|FormData|
//                       null|string|undefined} */
//            (body));

//        return this.completes;
//    }

//    /**
//     * Attempts to parse the response body of the XHR. If parsing succeeds,
//     * the value returned will be deserialized based on the `responseType`
//     * set on the XHR.
//     *
//     * @return {*} The parsed response,
//     * or undefined if there was an empty response or parsing failed.
//     */
//    parseResponse () {
//        var xhr = this.xhr;
//        var responseType = xhr.responseType || xhr._responseType;
//        var preferResponseText = !this.xhr.responseType;
//        var prefixLen = (xhr._jsonPrefix && xhr._jsonPrefix.length) || 0;

//        try {
//            switch (responseType) {
//                case 'json':
//                    // If the xhr object doesn't have a natural `xhr.responseType`,
//                    // we can assume that the browser hasn't parsed the response for us,
//                    // and so parsing is our responsibility. Likewise if response is
//                    // undefined, as there's no way to encode undefined in JSON.
//                    if (preferResponseText || xhr.response === undefined) {
//                        // Try to emulate the JSON section of the response body section of
//                        // the spec: https://xhr.spec.whatwg.org/#response-body
//                        // That is to say, we try to parse as JSON, but if anything goes
//                        // wrong return null.
//                        try {
//                            return JSON.parse(xhr.responseText);
//                        } catch (_) {
//                            return null;
//                        }
//                    }

//                    return xhr.response;
//                case 'xml':
//                    return xhr.responseXML;
//                case 'blob':
//                case 'document':
//                case 'arraybuffer':
//                    return xhr.response;
//                case 'text':
//                default: {
//                    // If `prefixLen` is set, it implies the response should be parsed
//                    // as JSON once the prefix of length `prefixLen` is stripped from
//                    // it. Emulate the behavior above where null is returned on failure
//                    // to parse.
//                    if (prefixLen) {
//                        try {
//                            return JSON.parse(xhr.responseText.substring(prefixLen));
//                        } catch (_) {
//                            return null;
//                        }
//                    }
//                    return xhr.responseText;
//                }
//            }
//        } catch (e) {
//            this.rejectCompletes(new Error('Could not parse response. ' + e.message));
//        }
//    }

//    /**
//     * Aborts the request.
//     */
//    abort () {
//        this._setAborted(true);
//        this.xhr.abort();
//    }

//    /**
//     * @param {*} body The given body of the request to try and encode.
//     * @param {?string} contentType The given content type, to infer an encoding
//     *     from.
//     * @return {*} Either the encoded body as a string, if successful,
//     *     or the unaltered body object if no encoding could be inferred.
//     */
//    _encodeBodyObject (body, contentType) {
//        if (typeof body == 'string') {
//            return body;  // Already encoded.
//        }
//        var bodyObj = /** @type {Object} */ (body);
//        switch (contentType) {
//            case ('application/json'):
//                return JSON.stringify(bodyObj);
//            case ('application/x-www-form-urlencoded'):
//                return this._wwwFormUrlEncode(bodyObj);
//        }
//        return body;
//    }

//    /**
//     * @param {Object} object The object to encode as x-www-form-urlencoded.
//     * @return {string} .
//     */
//    _wwwFormUrlEncode (object) {
//        if (!object) {
//            return '';
//        }
//        var pieces = [];
//        Object.keys(object).forEach(function (key) {
//            // TODO(rictic): handle array values here, in a consistent way with
//            //   iron-ajax params.
//            pieces.push(
//                this._wwwFormUrlEncodePiece(key) + '=' +
//                this._wwwFormUrlEncodePiece(object[key]));
//        }, this);
//        return pieces.join('&');
//    }

//    /**
//     * @param {*} str A key or value to encode as x-www-form-urlencoded.
//     * @return {string} .
//     */
//    _wwwFormUrlEncodePiece (str) {
//        // Spec says to normalize newlines to \r\n and replace %20 spaces with +.
//        // jQuery does this as well, so this is likely to be widely compatible.
//        if (str === null) {
//            return '';
//        }
//        return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n'))
//            .replace(/%20/g, '+');
//    }

//    /**
//     * Updates the status code and status text.
//     */
//    _updateStatus () {
//        this._setStatus(this.xhr.status);
//        this._setStatusText((this.xhr.statusText === undefined) ? '' : this.xhr.statusText);
//    }
//}
