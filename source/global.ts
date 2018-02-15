import { API_HOST, APP_HOST } from './lib/config'
import waitForComplete from './lib/wait-for-complete'

import CtrlpanelCore, { Account, State } from '@ctrlpanel/core'

import createInactivityTimer = require('inactivity-timer')
import findAccountsForHostname = require('@ctrlpanel/find-accounts-for-hostname')
import unwrap = require('ts-unwrap')
import uuid = require('uuid/v4')
import wextRuntime = require('@wext/runtime')
import wextTabs = require('@wext/tabs')

const core = new CtrlpanelCore(API_HOST)
let state: State = core.init()

const lockTimer = createInactivityTimer('5m', () => {
  if (state.kind === 'empty') return
  if (state.kind === 'locked') return

  state = core.lock(state)
})

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

  lockTimer.signal()
  return true
}

async function unlock (masterPassword: string) {
  if (state.kind !== 'locked') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  lockTimer.signal()
  state = await core.unlock(state, masterPassword)
}

async function sync () {
  if (state.kind === 'unlocked') {
    lockTimer.signal()
    state = await core.connect(state)
  }

  if (state.kind !== 'connected') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  lockTimer.signal()
  state = await core.sync(state)
}

async function getAccountsForHostname (hostname: string) {
  if (state.kind !== 'unlocked' && state.kind !== 'connected') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  const data = core.getParsedEntries(state)
  const accounts = Object.keys(data.accounts).map(key => Object.assign({ id: key, source: 'account' }, data.accounts[key]))
  const inbox = Object.keys(data.inbox).map(key => Object.assign({ id: key, source: 'inbox' }, data.inbox[key]))

  return findAccountsForHostname(hostname, [...accounts, ...inbox])
}

async function seed (handle: string, secretKey: string, masterPassword: string) {
  if (state.kind !== 'empty' && state.handle !== handle) {
    lockTimer.clear()
    state = await core.clearStoredData(state)
  }

  if (state.kind === 'empty') {
    state = await core.login(state, handle, secretKey, masterPassword, true)
  }

  if (state.kind === 'locked') {
    state = await core.unlock(state, masterPassword)
  }

  if (state.kind === 'unlocked') {
    lockTimer.signal()
    state = await core.connect(state)
  }

  lockTimer.signal()
  state = await core.sync(state)
}

async function signalActivity () {
  if (state.kind === 'empty') return
  if (state.kind === 'locked') return

  lockTimer.signal()
}

async function lock () {
  if (state.kind === 'empty') return
  if (state.kind === 'locked') return

  state = core.lock(state)
}

async function importInboxEntry (inboxEntryId: string, handle: string, hostname: string) {
  if (state.kind === 'unlocked') {
    state = await core.connect(state)
  }

  if (state.kind !== 'connected') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  const password = CtrlpanelCore.randomAccountPassword()
  const accountData = { handle, hostname, password }

  lockTimer.signal()
  state = await core.deleteInboxEntry(state, inboxEntryId)
  state = await core.createAccount(state, uuid(), accountData)
}

wextRuntime.onMessage.addListener((message, sender, sendResponse) => {
  Promise.resolve()
    .then<any, any>(() => {
      switch (message.method) {
        case 'needCredentials': return needCredentials()
        case 'needMasterPassword': return needMasterPassword()
        case 'unlock': return unlock(message.args[0])
        case 'sync': return sync()
        case 'getAccountsForHostname': return getAccountsForHostname(message.args[0])
        case 'seed': return seed(message.args[0], message.args[1], message.args[2])
        case 'signalActivity': return signalActivity()
        case 'lock': return lock()
        case 'importInboxEntry': return importInboxEntry(message.args[0], message.args[1], message.args[2])
        default: throw new Error(`Unknown method: ${message.method}`)
      }
    })
    .then(
      (result) => sendResponse({ result }),
      (err) => sendResponse({ error: { message: `${err.name}: ${err.message}`, code: err.code } })
    )

  return true
})
