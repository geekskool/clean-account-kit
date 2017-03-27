import node-core

express = require 'express'
path = require 'path'
sessions = require 'client-sessions'
bodyParser = require 'body-parser'
Mustache = require 'mustache'
Request = require 'request'
Querystring  = require 'querystring'

Guid = require 'guid'
csrfGuid = Guid.raw ()

akConfig = require './account-kit-config.json'
AKINIT =  { appId: akConfig.appID,
            csrf: csrfGuid,
            version: akConfig.version
          }

bodyParserJSON = bodyParser.json ()

app = express ()

app.use (express.static (path.join __dirname 'public'))
app.use bodyParserJSON
app.use (bodyParser.urlencoded {extended: true })

tokenExchangeBaseURL = 'https://graph.accountkit.com/' ++ akConfig.version ++ '/access_token?'
meEndpointBaseURL = 'https://graph.accountkit.com/' ++ akConfig.version ++ '/me' ++ '?access_token='

params = { grant_type: 'authorization_code',
           access_token: ['AA', akConfig.appID, akConfig.appSecret].join '|'
          }

app.use (sessions {
  cookieName: 'session',
  secret: 'mysecret',
  duration: 7 * 24 * 60 * 60 * 1000,
  activeDuration: 24 * 60 * 60 * 1000 })

do
  request response <- IO (app.get '/')
  maybeUndefined request.session.user (response.redirect '/login')
  response.send 'hello world'

do
  request response _ <- IO (app.get '/login')
  maybeTrue !!request.session.user (response.redirect '/')
  loginTemplate <- readFile 'views/login.html'
  response.send (Mustache.to_html loginTemplate AKINIT)

do
  request response _ <- IO (app.post '/login')
  let csrfCheck = request.body.csrf == csrfGuid
  maybeFalse csrfCheck (respose.end 'Something went terribly wrong')
  defineProp params 'code'  request.body.code
  err resp respBody <- IO (Request.get {url: tokenExchangeBaseURL ++ (Querystring.stringify params), json: true})
  errURL respURL respBodyURL <- IO (Request.get {url: meEndpointBaseURL ++ respBody.access_token, json:true })
  defineProp request.session 'user' respBodyURL.phone.number
  response.redirect '/'


do
  request response _ <- IO (app.get '/logout')
  delete request.session.user
  response.redirect '/'

PORT = process.env.PORT || 3000
app.listen PORT
