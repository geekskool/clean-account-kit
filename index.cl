import node-core

express = require 'express'
path = require 'path'
sessions = require 'client-sessions'


app = express ()
app.use (express.static (path.join __dirname 'public'))

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
  req res <- IO (app.get '/login')
  res.send 'login page'

do
  req res _ <- IO (app.get '/logout')
  delete req.session.user
  res.redirect '/'

app.listen 3000
