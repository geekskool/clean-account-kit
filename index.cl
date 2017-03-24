import node-core

express = require 'express'
path = require 'path'
sessions = require 'client-sessions'
bodyParser = require 'body-parser'
Guid = require 'guid'
Mustache = require 'mustache'
Request = require 'request'
Querystring  = require 'querystring'

bodyParserJSON = bodyParser.json ()
bodyParserURL =  bodyParser.urlencoded {extended: true }

app = express ()
app.use (express.static (path.join __dirname 'public'))

app.use bodyParserJSON
app.use bodyParserURL

// update config file for details of account_kit_api_version
// app_secret

account_kit = do
                data <- readFile './config/account-kit.json'
                return data

appConfig = require './config/account-kit.json'

csrf_guid = Guid.raw ()


//Add account_kit essentials in config file and require

account_kit_api_version = appConfig.version
app_id = appConfig.app_id
app_secret = appConfig.app_secret



me_endpoint_base_url = 'https://graph.accountkit.com/v1.1/me'
token_exchange_base_url = 'https://graph.accountkit.com/v1.1/access_token'


loadLoginData = do
                  data <- readFile 'views/login.html'
                  return data


loadLoginSuccData = do
                      data <- readFile 'views/login_success.html'
                      return data



app.use (sessions {
  cookieName: 'session',
  secret: 'mysecret',
  duration: 7 * 24 * 60 * 60 * 1000,
  activeDuration: 24 * 60 * 60 * 1000 })

do
  req res <- IO (app.get '/')
  mayBeUndefined req.session.user (res.redirect '/login')
  res.send 'hello world'


do
  req res _ <- IO (app.get '/login')
  let view =  { appId: app_id,
                csrf: csrf_guid,
                version: account_kit_api_version}
  loadLogin <- loadLoginData
  let html = Mustache.to_html loadLogin view
  res.send html



do
  req res _ <- IO (app.post '/login_success')
  let csrfCheck = (req.body.csrf == csrf_guid)
  mayBeFalse csrfCheck (res.end 'Something went')
  putLine 'This is after'
  let app_access_token = ['AA', app_id, app_secret].join '|'
  let params = {
                 grant_type: 'authorization_code',
                 code: req.body.code,
                 access_token: app_access_token
                    }
   loadLoginSuccess <- loadLoginSuccData
   let token_exchange_url = token_exchange_base_url ++ '?' ++ (Querystring.stringify params)
   err resp respBody <- IO (Request.get {url: token_exchange_url, json: true})
   let view = {
            user_access_token: respBody.access_token,
            expires_at: respBody.expires_at,
            user_id: respBody.id,
                }
   let me_endpoint_url = me_endpoint_base_url ++ '?access_token=' ++ respBody.access_token
   errURL respURL respBodyURL <- IO (Request.get {url: me_endpoint_url, json:true })
   defineProp view 'phone_num' respBodyURL.phone.number
   let html = Mustache.to_html loadLoginSuccess view
   res.send 'Account kit implementation in clean'


do
  req res _ <- IO (app.get '/logout')
  delete req.session.user
  res.redirect '/'

port = 3000 || process.env.PORT
app.listen port
