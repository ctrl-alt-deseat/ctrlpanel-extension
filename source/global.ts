import { API_HOST, APP_HOST } from './config'
import stripCommonPrefixes from './lib/strip-common-prefixes'
import waitForComplete from './lib/wait-for-complete'

import CtrlpanelCore, { State } from '@ctrlpanel/core'

import wextRuntime = require('@wext/runtime')
import wextTabs = require('@wext/tabs')
import unwrap = require('ts-unwrap')

const core = new CtrlpanelCore(API_HOST)
let state: State = core.init()

const LockTimeout = {
  id: null as any,
  extend () {
    if (this.id) clearTimeout(this.id)

    this.id = setTimeout(() => {
      this.id = null

      if (state.kind === 'empty') return
      if (state.kind === 'locked') return

      state = core.lock(state)
    }, 5 * 60 * 1000)
  }
}

async function needCredentials () {
  if (state.kind === 'locked') return false
  if (state.kind === 'unlocked') return false
  if (state.kind === 'connected') return false

  const tab = unwrap(await wextTabs.create({ active: false, url: `${APP_HOST}/` }))
  const tabId = unwrap(tab.id)

  await waitForComplete(tabId)

  const syncToken = unwrap(await wextTabs.executeScript(tabId, { code: 'window.localStorage.getItem("credentials")' }))[0] as string | undefined

  if (!syncToken) {
    await wextTabs.update(tabId, { active: true })
    return true
  }

  await wextTabs.remove(tabId)

  state = core.init(syncToken)

  return false
}

async function needMasterPassword () {
  if (state.kind === 'unlocked') return false
  if (state.kind === 'connected') return false

  if (state.kind !== 'locked') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  LockTimeout.extend()
  return true
}

async function unlock (masterPassword: string) {
  if (state.kind !== 'locked') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  LockTimeout.extend()
  state = await core.unlock(state, masterPassword)
}

async function sync () {
  if (state.kind === 'unlocked') {
    LockTimeout.extend()
    state = await core.connect(state)
  }

  if (state.kind !== 'connected') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  LockTimeout.extend()
  state = await core.sync(state)
}

async function getAccountForHostname (hostname: string) {
  if (state.kind !== 'unlocked' && state.kind !== 'connected') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  const data = core.getParsedEntries(state)
  const search = stripCommonPrefixes(hostname)
  const accounts = Object.keys(data.accounts).map(key => data.accounts[key])

  return accounts.find(acc => stripCommonPrefixes(acc.hostname) === search)
}

wextRuntime.onMessage.addListener((message, sender, sendResponse) => {
  Promise.resolve()
    .then<any, any>(() => {
      switch (message.method) {
        case 'needCredentials': return needCredentials()
        case 'needMasterPassword': return needMasterPassword()
        case 'unlock': return unlock(message.args[0])
        case 'sync': return sync()
        case 'getAccountForHostname': return getAccountForHostname(message.args[0])
        default: throw new Error(`Unknown method: ${message.method}`)
      }
    })
    .then(
      (result) => sendResponse({ result }),
      (err) => sendResponse({ error: { message: `${err.name}: ${err.message}`, code: err.code }})
    )

  return true
})
