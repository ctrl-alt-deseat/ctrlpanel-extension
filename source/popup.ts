import unwrap = require('ts-unwrap')

import CtrlpanelCore, { State } from '@ctrlpanel/core'
import * as wextTabs from '@wext/tabs'

import { API_HOST, APP_HOST, AUTO_SUBMIT } from './config'

const unlockContainer = unwrap(document.querySelector<HTMLDivElement>('div.unlock-container'))
const unlockForm = unwrap(document.querySelector<HTMLFormElement>('form.unlock-form'))
const unlockInput = unwrap(document.querySelector<HTMLInputElement>('input.unlock-input'))
const unlockError = unwrap(document.querySelector<HTMLDivElement>('div.unlock-error'))

const statusContainer = unwrap(document.querySelector<HTMLDivElement>('div.status-container'))
const statusMessage = unwrap(document.querySelector<HTMLDivElement>('div.status-message'))

setTimeout(() => unlockInput.focus(), 200)

const core = new CtrlpanelCore(API_HOST)

let state: State = core.init()

function waitForComplete (targetTabId: number) {
  return new Promise((resolve, reject) => {
    wextTabs.onUpdated.addListener(function listener (tabId, changeInfo) {
      if (tabId === targetTabId && changeInfo.status === 'complete') {
        wextTabs.onUpdated.removeListener(listener)
        resolve()
      }
    })
  })
}
unlockForm.addEventListener('submit', async (ev) => {
  ev.preventDefault()

  const masterPassword = unlockInput.value

  unlockContainer.style.display = 'none'
  statusContainer.style.display = ''
  unlockError.textContent = ''

  if (state.kind === 'empty') {
    statusMessage.textContent = 'Fetching credentials...'

    const tab = unwrap(await wextTabs.create({ active: false, url: `${APP_HOST}/#login` }))
    const tabId = unwrap(tab.id)

    await waitForComplete(tabId)

    const syncToken = unwrap(await wextTabs.executeScript(tabId, { code: 'window.localStorage.getItem("credentials")' }))[0] as string | undefined

    if (!syncToken) {
      statusMessage.textContent = 'Please log in to Ctrlpanel'
      await wextTabs.update(tabId, { active: true })
      return
    }

    await wextTabs.remove(tabId)

    state = core.init(syncToken)
  }

  if (state.kind === 'locked') {
    try {
      statusMessage.textContent = 'Unlocking...'
      state = await core.unlock(state, masterPassword)
    } catch (err) {
      if (err.code === 'WRONG_MASTER_PASSWORD') {
        unlockContainer.style.display = ''
        statusContainer.style.display = 'none'
        unlockError.textContent = 'Wrong master password'
      }

      throw err
    }
  }

  if (state.kind === 'unlocked') {
    statusMessage.textContent = 'Connecting...'
    state = await core.connect(state)
  }

  statusMessage.textContent = 'Syncing...'
  state = await core.sync(state)

  statusMessage.textContent = 'Findind account...'
  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]
  const hostname = (new URL(unwrap(tab.url))).hostname.replace('www.', '')

  const data = core.getParsedEntries(state)
  const accounts = Object.keys(data.accounts).map(key => data.accounts[key])
  const facebook = accounts.find(acc => acc.hostname.replace('www.', '') === hostname)

  if (!facebook) {
    statusMessage.textContent = 'No account found'
    return
  }

  statusMessage.textContent = 'Filling...'

  try {
    await wextTabs.executeScript({ file: '/filler.js' })
    await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_perform_login__(${JSON.stringify(facebook.handle)}, ${JSON.stringify(facebook.password)}, ${JSON.stringify(AUTO_SUBMIT)})` })
  } catch (_) {
    statusMessage.textContent = 'Failed to fill'
    return
  }

  window.close()
})
