class IOCore {constructor (ioFunc) {this.then = cb => ioFunc((...args) => { cb(...args) });};reject (pred) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = pred(...args);if (result !== null) {if (Array.isArray(result)) {cb(...result);} else {cb(result);}};});};return this;};mayBeFalse (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === false) {handler(...args);} else {cb(...args);}});};return this;};mayBeNull (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === null) {handler(...args);} else {cb(...args);}});};return this;};mayBeErr (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result instanceof Error) {handler(...args);} else {cb(...args);}});};return this;};mayBeTrue (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === true) {handler(...args);} else {cb(...args);}});};return this;};mayBeUndefined (mv, handler) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = mv(...args);if (result === undefined) {handler(...args);} else {cb(...args);}});};return this;};map (transform) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let result = transform(...args);if (Array.isArray(result)) {cb(...result);} else {cb(result);}});};return this;};bind (ioFunc) {let saveThen = this.then;this.then = cb => {saveThen((...args) => {let io = ioFunc(...args);io.then((...ioargs) => cb(...args, ...ioargs));});};return this;};static timer (s) {var intervalId;var timer = new IOCore(cb => {intervalId = setInterval(cb, Math.floor(s * 1000))});timer.clear = () => clearInterval(intervalId);return timer;};static createIO (ioFunc) {return new IOCore(ioFunc);};};const readline = require('readline');const fs = require('fs');const rlConfig = {input: process.stdin,output: process.stdout}; class IO extends IOCore {static getLine (str) {const rl = readline.createInterface(rlConfig);return new IOCore(cb => rl.question(str, cb)).map(data => {rl.close();return data;});};static putLine (...data) {return new IOCore(cb => process.nextTick(cb, data)).map(data => {console.log(...data);return data});};static readFile (filename) {return new IOCore(cb => fs.readFile(filename, cb)).map((_, data) => data.toString());};static writeFile (filename, data) {return new IOCore(cb => fs.writeFile(filename, data, cb));};};

const express = require('express');
const path = require('path');
const sessions = require('client-sessions');
const bodyParser = require('body-parser');
const Guid = require('guid');
const Mustache = require('mustache');
const Request = require('request');
const Querystring = require('querystring');
const appConfig = require('./account-kit-config.json');
const bodyParserJSON = bodyParser.json();
const bodyParserURL = bodyParser.urlencoded({ extended: true });
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParserJSON);
app.use(bodyParserURL);
const csrfGuid = Guid.raw();
const meEndpointBaseURL = 'https://graph.accountkit.com/' + appConfig.version + '/me';
const tokenExchangeBaseURL = 'https://graph.accountkit.com/' + appConfig.version + '/access_token';
app.use(sessions({
    cookieName: 'session',
    secret: 'mysecret',
    duration: 7 * 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));
IO.createIO(cb => app.get('/', cb)).mayBeUndefined((req, res) => req.session.user, (req, res) => res.redirect('/login')).then((req, res) => {
    res.send('hello world');
});
IO.createIO(cb => app.get('/login', cb)).map((req, res, _) => [
    {
        appId: appConfig.appID,
        csrf: csrfGuid,
        version: appConfig.version
    },
    req,
    res,
    _
]).bind((view, req, res, _) => IO.readFile('views/login.html')).map((view, req, res, _, loadLogin) => [
    Mustache.to_html(loadLogin, view),
    view,
    req,
    res,
    _,
    loadLogin
]).then((html, view, req, res, _, loadLogin) => {
    res.send(html);
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
            appConfig.appID,
            appConfig.appSecret
        ].join('|')
    },
    csrfCheck,
    req,
    res,
    _
]).bind((params, csrfCheck, req, res, _) => IO.readFile('views/login_success.html')).map((params, csrfCheck, req, res, _, loadLoginSuccess) => [
    tokenExchangeBaseURL + '?' + Querystring.stringify(params),
    params,
    csrfCheck,
    req,
    res,
    _,
    loadLoginSuccess
]).bind((tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess) => IO.createIO(cb => Request.get({
    url: tokenExchangeURL,
    json: true
}, cb))).map((tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody) => [
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
    loadLoginSuccess,
    err,
    resp,
    respBody
]).map((view, tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody) => [
    meEndpointBaseURL + '?access_token=' + view.userAccessToken,
    view,
    tokenExchangeURL,
    params,
    csrfCheck,
    req,
    res,
    _,
    loadLoginSuccess,
    err,
    resp,
    respBody
]).bind((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody) => IO.createIO(cb => Request.get({
    url: meEndpointURL,
    json: true
}, cb))).map((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody, errURL, respURL, respBodyURL) => {
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
        loadLoginSuccess,
        err,
        resp,
        respBody,
        errURL,
        respURL,
        respBodyURL
    ];
}).map((meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody, errURL, respURL, respBodyURL) => [
    Mustache.to_html(loadLoginSuccess, view),
    meEndpointURL,
    view,
    tokenExchangeURL,
    params,
    csrfCheck,
    req,
    res,
    _,
    loadLoginSuccess,
    err,
    resp,
    respBody,
    errURL,
    respURL,
    respBodyURL
]).then((html, meEndpointURL, view, tokenExchangeURL, params, csrfCheck, req, res, _, loadLoginSuccess, err, resp, respBody, errURL, respURL, respBodyURL) => {
    res.send(html);
});
IO.createIO(cb => app.get('/logout', cb)).map((req, res, _) => {
    (delete req.session.user)
    return [
        req,
        res,
        _
    ];
}).then((req, res, _) => {
    res.redirect('/');
});
const port = 3000 || process.env.PORT;
app.listen(port);
