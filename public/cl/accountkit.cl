import browser-core

Object.defineProperty window 'AccountKit_OnInteractive' {value: (\ -> AccountKit.init appParams)}

do
  event <- click (document.querySelector 'button')
  response <- IO (AccountKit.login 'PHONE' {})
  maybeTrue (response.status == 'NOT_AUTHENTICATED') (alert 'Not Authenticated')
  maybeTrue (response.status == 'BAD_PARAMS') (alert 'BAD_PARAMS')
  validResp <- postJSON '/login' {code: response.code, csrf: response.state}
  maybeTrue validResp.success (location.assign '/')
