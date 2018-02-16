import { seed, signalActivity, lock, promptInboxEntry } from './lib/extension'
import { getLoginTarget } from '@linusu/locust'

if (process.env.TARGET_BROWSER === 'safari') require('@wext/tabs/safari-shim')

if (window.location.origin === process.env.APP_HOST) {
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return
    if (ev.origin !== process.env.APP_HOST) return
    if (ev.origin !== window.location.origin) return

    if (ev.data.method === 'ctrlpanel-extension-seed') {
      seed(ev.data.args[0], ev.data.args[1], ev.data.args[2])
    }

    if (ev.data.method === 'ctrlpanel-extension-signal-activity') {
      signalActivity()
    }

    if (ev.data.method === 'ctrlpanel-extension-lock') {
      lock()
    }
  })
}

window.__ctrlpanel_extension_available_fields__ = function () {
  const loginTarget = getLoginTarget()

  return {
    handle: Boolean(loginTarget && loginTarget.usernameField),
    password: Boolean(loginTarget && loginTarget.passwordField)
  }
}

window.__ctrlpanel_extension_fill_field__ = function (field: 'handle' | 'password', value: string) {
  getLoginTarget()[field === 'handle' ? 'fillUsername' : 'fillPassword'](value)
}

window.__ctrlpanel_extension_perform_login__ = function (handle: string, password: string, submit: boolean) {
  getLoginTarget()[submit ? 'login' : 'enterDetails'](handle, password)
}

const loginTarget = getLoginTarget()

if (loginTarget) {
  let username = ''

  loginTarget.on('valueChanged', ({ type, value }) => { if (type === 'username') username = value })
  loginTarget.on('formSubmitted', () => promptInboxEntry(window.location.hostname, username))
}
