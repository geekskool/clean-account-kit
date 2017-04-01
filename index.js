class IOCore {constructor (ioFunc) {this.then = cb => ioFunc((...args) => { cb(...args) });};reject (pred) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = pred(...args);if (result !== null) {if (Array.isArray(result)) {cb(...result);} else {cb(result);}};});};return this;};maybeFalse (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === false) {handler(...args);} else {cb(...args);}});};return this;};maybeNull (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === null) {handler(...args);} else {cb(...args);}});};return this;};maybeErr (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result instanceof Error) {handler(...args);} else {cb(...args);}});};return this;};maybeTrue (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === true) {handler(...args);} else {cb(...args);}});};return this;};maybeUndefined (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === undefined) {handler(...args);} else {cb(...args);}});};return this;};map (transform) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = transform(...args);if (Array.isArray(result)) {cb(...result);} else {cb(result);}});};return this;};bind (ioFunc) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let io = ioFunc(...args);io.then((...ioargs) => cb(...args, ...ioargs));});};return this;};static timer (s) {var intervalId;var timer = new IOCore(cb => {intervalId = setInterval(cb, Math.floor(s * 1000))});timer.clear = () => clearInterval(intervalId);return timer;};static createIO (ioFunc) {return new IOCore(ioFunc);};};const readline = require('readline');const fs = require('fs');const rlConfig = {input: process.stdin,output: process.stdout}; class IO extends IOCore {static getLine (str) {const rl = readline.createInterface(rlConfig);return new IOCore(cb => rl.question(str, cb)).map(data => {rl.close();return data;});};static putLine (...data) {return new IOCore(cb => process.nextTick(cb, data)).map(data => {console.log(...data);return data});};static readFile (filename) {return new IOCore(cb => fs.readFile(filename, cb)).map((_, data) => data.toString());};static writeFile (filename, data) {return new IOCore(cb => fs.writeFile(filename, data, cb));};};

const express = require('express');
const path = require('path');
const sessions = require('client-sessions');
const bodyParser = require('body-parser');
const Mustache = require('mustache');
const Request = require('request');
const Querystring = require('querystring');
const Guid = require('guid');
const csrfGuid = Guid.raw();
const akConfig = require('./account-kit-config.json');
const AKINIT = {
    appId: akConfig.appID,
    csrf: csrfGuid,
    version: akConfig.version
};
const bodyParserJSON = bodyParser.json();
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParserJSON);
app.use(bodyParser.urlencoded({ extended: true }));
const tokenExchangeBaseURL = 'https://graph.accountkit.com/' + akConfig.version + '/access_token?';
const meEndpointBaseURL = 'https://graph.accountkit.com/' + akConfig.version + '/me' + '?access_token=';
const params = {
    grant_type: 'authorization_code',
    access_token: [
        'AA',
        akConfig.appID,
        akConfig.appSecret
    ].join('|')
};
app.use(sessions({
    cookieName: 'session',
    secret: 'mysecret',
    duration: 7 * 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));
IO.createIO(cb => app.get('/', cb)).map((req, res) => [
    req,
    res
]).maybeUndefined((req, res) => req.session.user, (req, res) => res.redirect('/login')).map((req, res) => {
    (res.send('hello world'))
    return [
        req,
        res
    ];
}).then((req, res) => []);
IO.createIO(cb => app.get('/login', cb)).map((request, response) => [
    request,
    response
]).maybeTrue((request, response) => !!request.session.user, (request, response) => response.redirect('/')).bind((request, response) => IO.readFile('views/login.html')).map((request, response, loginTemplate) => [
    request,
    response,
    loginTemplate
]).map((request, response, loginTemplate) => {
    (response.send(Mustache.to_html(loginTemplate, AKINIT)))
    return [
        request,
        response,
        loginTemplate
    ];
}).then((request, response, loginTemplate) => []);
IO.createIO(cb => app.post('/login', cb)).map((request, response) => [
    request,
    response
]).map((request, response) => [
    request.body.csrf === csrfGuid,
    request,
    response
]).maybeFalse((csrfCheck, request, response) => csrfCheck, (csrfCheck, request, response) => response.send({ success: false })).map((csrfCheck, request, response) => {
    Object.defineProperty(params, 'code', {
        value: request.body.code,
        enumerable: true,
        writable: false,
        configurable: true
    });
    return [
        csrfCheck,
        request,
        response
    ];
}).bind((csrfCheck, request, response) => IO.createIO(cb => Request.get({
    url: tokenExchangeBaseURL + Querystring.stringify(params),
    json: true
}, cb))).map((csrfCheck, request, response, err, resp, respBody) => [
    csrfCheck,
    request,
    response,
    err,
    resp,
    respBody
]).bind((csrfCheck, request, response, err, resp, respBody) => IO.createIO(cb => Request.get({
    url: meEndpointBaseURL + respBody.access_token,
    json: true
}, cb))).map((csrfCheck, request, response, err, resp, respBody, errURL, respURL, respBodyURL) => [
    csrfCheck,
    request,
    response,
    err,
    resp,
    respBody,
    errURL,
    respURL,
    respBodyURL
]).map((csrfCheck, request, response, err, resp, respBody, errURL, respURL, respBodyURL) => {
    Object.defineProperty(request.session, 'user', {
        value: respBodyURL.phone.number,
        enumerable: true,
        writable: false,
        configurable: true
    });
    return [
        csrfCheck,
        request,
        response,
        err,
        resp,
        respBody,
        errURL,
        respURL,
        respBodyURL
    ];
}).map((csrfCheck, request, response, err, resp, respBody, errURL, respURL, respBodyURL) => {
    (response.send({ success: true }))
    return [
        csrfCheck,
        request,
        response,
        err,
        resp,
        respBody,
        errURL,
        respURL,
        respBodyURL
    ];
}).then((csrfCheck, request, response, err, resp, respBody, errURL, respURL, respBodyURL) => []);
IO.createIO(cb => app.get('/logout', cb)).map((request, response) => [
    request,
    response
]).map((request, response) => {
    (delete request.session.user)
    return [
        request,
        response
    ];
}).map((request, response) => {
    (response.redirect('/'))
    return [
        request,
        response
    ];
}).then((request, response) => []);
const PORT = process.env.PORT || 3000;
app.listen(PORT);
