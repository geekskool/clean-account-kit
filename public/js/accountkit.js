class IOCore {constructor (ioFunc) {this.then = cb => ioFunc((...args) => { cb(...args) });};reject (pred) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = pred(...args);if (result !== null) {if (Array.isArray(result)) {cb(...result);} else {cb(result);}};});};return this;};maybeFalse (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === false) {handler(...args);} else {cb(...args);}});};return this;};maybeNull (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === null) {handler(...args);} else {cb(...args);}});};return this;};maybeErr (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result instanceof Error) {handler(...args);} else {cb(...args);}});};return this;};maybeTrue (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === true) {handler(...args);} else {cb(...args);}});};return this;};maybeUndefined (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === undefined) {handler(...args);} else {cb(...args);}});};return this;};map (transform) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = transform(...args);if (Array.isArray(result)) {cb(...result);} else {cb(result);}});};return this;};bind (ioFunc) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let io = ioFunc(...args);io.then((...ioargs) => cb(...args, ...ioargs));});};return this;};static timer (s) {var intervalId;var timer = new IOCore(cb => {intervalId = setInterval(cb, Math.floor(s * 1000))});timer.clear = () => clearInterval(intervalId);return timer;};static createIO (ioFunc) {return new IOCore(ioFunc);};};const createRequest = (method, url, cb) => {const request = new window.XMLHttpRequest();request.addEventListener('load', () => {if (request.status === 200) {cb(request);} else {cb(new Error(request.statusText));}});request.addEventListener('timeout', () => cb(new Error('Request timed out')));request.addEventListener('abort', () => cb(new Error('Request aborted')));request.addEventListener('error', () => cb(new Error('Request failed')));request.open(method, url);return request;};class IO extends IOCore {static get (url) {return new IOCore(cb => {const request = createRequest('GET', url, cb);request.send();}).map(request => request.responseText);};static del (url) {return new IOCore(cb => {const request = createRequest('DELETE', url, cb);request.send();}).map(request => request.responseText);};static getJSON (url) {return new IOCore(cb => {const request = createRequest('GET', url, cb);request.responseType = 'json';request.send();}).map(request => [request.response]);};static delJSON (url) {return new IOCore(cb => {const request = createRequest('DELETE', url, cb);request.responseType = 'json';request.send();}).map(request => [request.response]);};static getBlob (url) {return new IOCore(cb => {const request = createRequest('GET', url, cb);request.responseType = 'blob';request.send();}).map(request => new window.Blob([request.response]));};static postJSON (url, obj) {return new IOCore(cb => {const request = createRequest('POST', url, cb);request.setRequestHeader('Content-Type', 'application/json');request.responseType = 'json';request.send(JSON.stringify(obj));}).map(request => [request.response]);};static putJSON (url, obj) {return new IOCore(cb => {const request = createRequest('PUT', url, cb);request.setRequestHeader('Content-Type', 'application/json');request.responseType = 'json';request.send(JSON.stringify(obj));}).map(request => [request.response]);};static click (elem) {return new IOCore(cb => elem.addEventListener('click', cb));};static change (elem) {return new IOCore(cb => elem.addEventListener('change', cb)).map(e => e.target.value);}}

Object.defineProperty(window, 'AccountKit_OnInteractive', { value: () => AccountKit.init(appParams) });
IO.click(document.querySelector('button')).map(event => [event]).bind(event => IO.createIO(cb => AccountKit.login('PHONE', {}, cb))).map((event, response) => [
    event,
    response
]).maybeTrue((event, response) => response.status === 'NOT_AUTHENTICATED', (event, response) => alert('Not Authenticated')).maybeTrue((event, response) => response.status === 'BAD_PARAMS', (event, response) => alert('BAD_PARAMS')).bind((event, response) => IO.postJSON('/login', {
    code: response.code,
    csrf: response.state
})).map((event, response, validResp) => [
    event,
    response,
    validResp
]).maybeTrue((event, response, validResp) => validResp.success, (event, response, validResp) => location.assign('/')).then((event, response, validResp) => []);
