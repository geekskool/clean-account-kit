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

meEndpointBaseURL = 'https://graph.accountkit.com/' ++ akConfig.version ++ '/me'
tokenExchangeBaseURL = 'https://graph.accountkit.com/' ++ akConfig.version ++ '/access_token'

app.use (sessions {
  cookieName: 'session',
  secret: 'mysecret',
  duration: 7 * 24 * 60 * 60 * 1000,
  activeDuration: 24 * 60 * 60 * 1000 })

do
  request response <- IO (app.get '/')
  mayBeUndefined request.session.user (response.redirect '/login')
  response.send 'hello world'

do
  request response _ <- IO (app.get '/login')
  loginTemplate <- readFile 'views/login.html'
  response.send (Mustache.to_html loginTemplate AKINIT)

do
  req res _ <- IO (app.post '/login_success')
  let csrfCheck = (req.body.csrf == csrfGuid)
  mayBeFalse csrfCheck (res.end 'Something went terribly wrong')
  let params = {
                 grant_type: 'authorization_code',
                 code: req.body.code,
                 access_token: ['AA', akConfig.appID, akConfig.appSecret].join '|'
               }
   let tokenExchangeURL = tokenExchangeBaseURL ++ '?' ++ (Querystring.stringify params)
   err resp respBody <- IO (Request.get {url: tokenExchangeURL, json: true})
   let view = {
                userAccessToken: respBody.access_token,
                expiresAt: respBody.expires_at,
                userId: respBody.id,
              }
   let meEndpointURL = meEndpointBaseURL ++ '?access_token=' ++ view.userAccessToken
   errURL respURL respBodyURL <- IO (Request.get {url: meEndpointURL, json:true })
   defineProp view 'phoneNumber' respBodyURL.phone.number
   let html = Mustache.to_html loadLoginSuccess view
   res.send html


do
  request response _ <- IO (app.get '/logout')
  delete request.session.user
  response.redirect '/'

PORT = process.env.PORT || 3000
app.listen PORT
