import { seed } from './lib/extension'

if (process.env.TARGET_BROWSER === 'safari') require('@wext/tabs/safari-shim')

if (window.location.origin === process.env.APP_HOST) {
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return
    if (ev.origin !== process.env.APP_HOST) return
    if (ev.origin !== window.location.origin) return

    if (ev.data.method === 'ctrlpanel-extension-seed') {
      seed(ev.data.args[0], ev.data.args[1], ev.data.args[2])
    }
  })
}
