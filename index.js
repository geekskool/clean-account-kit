class IOCore {constructor (ioFunc) {this.then = cb => ioFunc((...args) => { cb(...args) });};reject (pred) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = pred(...args);if (result !== null) {if (Array.isArray(result)) {cb(...result);} else {cb(result);}};});};return this;};mayBeFalse (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === false) {handler(...args);} else {cb(...args);}});};return this;};mayBeNull (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === null) {handler(...args);} else {cb(...args);}});};return this;};mayBeErr (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result instanceof Error) {handler(...args);} else {cb(...args);}});};return this;};mayBeTrue (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === true) {handler(...args);} else {cb(...args);}});};return this;};mayBeUndefined (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === undefined) {handler(...args);} else {cb(...args);}});};return this;};map (transform) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = transform(...args);if (Array.isArray(result)) {cb(...result);} else {cb(result);}});};return this;};bind (ioFunc) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let io = ioFunc(...args);io.then((...ioargs) => cb(...args, ...ioargs));});};return this;};static timer (s) {var intervalId;var timer = new IOCore(cb => {intervalId = setInterval(cb, Math.floor(s * 1000))});timer.clear = () => clearInterval(intervalId);return timer;};static createIO (ioFunc) {return new IOCore(ioFunc);};};const readline = require('readline');const fs = require('fs');const rlConfig = {input: process.stdin,output: process.stdout}; class IO extends IOCore {static getLine (str) {const rl = readline.createInterface(rlConfig);return new IOCore(cb => rl.question(str, cb)).map(data => {rl.close();return data;});};static putLine (...data) {return new IOCore(cb => process.nextTick(cb, data)).map(data => {console.log(...data);return data});};static readFile (filename) {return new IOCore(cb => fs.readFile(filename, cb)).map((_, data) => data.toString());};static writeFile (filename, data) {return new IOCore(cb => fs.writeFile(filename, data, cb));};};

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
const meEndpointBaseURL = 'https://graph.accountkit.com/' + akConfig.version + '/me';
const tokenExchangeBaseURL = 'https://graph.accountkit.com/' + akConfig.version + '/access_token';
app.use(sessions({
    cookieName: 'session',
    secret: 'mysecret',
    duration: 7 * 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));
IO.createIO(cb => app.get('/', cb)).mayBeUndefined((request, response) => request.session.user, (request, response) => response.redirect('/login')).then((request, response) => {
    response.send('hello world');
});
IO.createIO(cb => app.get('/login', cb)).bind((request, response, _) => IO.readFile('views/login.html')).then((request, response, _, loginTemplate) => {
    response.send(Mustache.to_html(loginTemplate, AKINIT));
});
IO.createIO(cb => app.post('/login_success', cb)).map((req, res, _) => [
    req.body.csrf === csrfGuid,
    req,
    res,
    _
]).mayBeFalse((csrfCheck, req, res, _) => csrfCheck, (csrfCheck, req, res, _) => res.end('Something went terribly wrong')).map((csrfCheck, req, res, _) => [
    {
        grant_type: 'authorization_code',
        code: req.body.code,
        access_token: [
            'AA',
            akConfig.appID,
            akConfig.appSecret
        ].join('|')
    },
    csrfCheck,
    req,
    res,
    _
]).map((params, csrfCheck, req, res, _) => [
    tokenExchangeBaseURL + '?' + Querystring.stringify(params),
    params,
    csrfCheck,
    req,
    res,
    _
]).bind((tokenExchangeURL, params, csrfCheck, req, res, _) => IO.createIO(cb => Request.get({
    url: tokenExchangeURL,
    json: true
}, cb))).map((tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody) => [
    {
        userAccessToken: respBody.access_token,
        expiresAt: respBody.expires_at,
        userId: respBody.id
    },
    tokenExchangeURL,
    params,
    csrfCheck,
    req,
    res,
    _,
    err,
    resp,
    respBody
]).map((view, tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody) => [
    meEndpointBaseURL + '?access_token=' + view.userAccessToken,
    view,
    tokenExchangeURL,
    params,
    csrfCheck,
    req,
    res,
    _,
    err,
    resp,
    respBody
]).bind((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody) => IO.createIO(cb => Request.get({
    url: meEndpointURL,
    json: true
}, cb))).map((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody, errURL, respURL, respBodyURL) => {
    Object.defineProperty(view, 'phoneNumber', {
        value: respBodyURL.phone.number,
        enumerable: true,
        writable: false,
        configurable: true
    });
    return [
        meEndpointURL,
        view,
        tokenExchangeURL,
        params,
        csrfCheck,
        req,
        res,
        _,
        err,
        resp,
        respBody,
        errURL,
        respURL,
        respBodyURL
    ];
}).map((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody, errURL, respURL, respBodyURL) => [
    Mustache.to_html(loadLoginSuccess, view),
    meEndpointURL,
    view,
    tokenExchangeURL,
    params,
    csrfCheck,
    req,
    res,
    _,
    err,
    resp,
    respBody,
    errURL,
    respURL,
    respBodyURL
]).then((html, meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, err, resp, respBody, errURL, respURL, respBodyURL) => {
    res.send(html);
});
IO.createIO(cb => app.get('/logout', cb)).map((request, response, _) => {
    (delete request.session.user)
    return [
        request,
        response,
        _
    ];
}).then((request, response, _) => {
    response.redirect('/');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT);
