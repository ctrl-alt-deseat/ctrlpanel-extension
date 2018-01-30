/* global safari */

import unwrap = require('ts-unwrap')

import CtrlpanelCore, { State } from '@ctrlpanel/core'
import * as wextTabs from '@wext/tabs'

import { API_HOST, APP_HOST, AUTO_SUBMIT } from './config'

const hasSafariGlobal = (typeof safari === 'object')

const unlockContainer = unwrap(document.querySelector<HTMLDivElement>('div.unlock-container'))
const unlockForm = unwrap(document.querySelector<HTMLFormElement>('form.unlock-form'))
const unlockMesage = unwrap(document.querySelector<HTMLDivElement>('div.unlock-message'))
const unlockInput = unwrap(document.querySelector<HTMLInputElement>('input.unlock-input'))
const unlockError = unwrap(document.querySelector<HTMLDivElement>('div.unlock-error'))

const statusContainer = unwrap(document.querySelector<HTMLDivElement>('div.status-container'))

const errorContainer = unwrap(document.querySelector<HTMLDivElement>('div.error-container'))
const errorMessage = unwrap(document.querySelector<HTMLDivElement>('div.error-message'))
const errorAppLink = unwrap(document.querySelector<HTMLAnchorElement>('div.error-app-link a'))

const reCommonPrefixes = /^(account|accounts|app|dashboard|login|signin|www)\./

setTimeout(() => unlockInput.focus(), 200)

const core = new CtrlpanelCore(API_HOST)
const originalHeight = document.body.clientHeight

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

function refreshPopupHeight () {
  if (hasSafariGlobal) safari.self.height = document.body.clientHeight
}

function hidePopup () {
  return (hasSafariGlobal ? safari.self.hide() : window.close())
}

// Safari doesn't reset the popup when it closes
if (hasSafariGlobal) {
  window.addEventListener('blur', () => {
    setTimeout(() => {
      safari.self.height = originalHeight
      unlockInput.value = ''
      unlockContainer.style.display = 'none'
      statusContainer.style.display = 'none'
      errorContainer.style.display = 'none'
    }, 280)
  })

  window.addEventListener('focus', async () => {
    onPopupOpen()
  })
} else {
  onPopupOpen()
}

function displayError (message: string) {
  unlockContainer.style.display = 'none'
  statusContainer.style.display = 'none'
  errorContainer.style.display = ''
  errorMessage.textContent = message
  refreshPopupHeight()
}

async function onPopupOpen () {
  unlockMesage.innerHTML = '&nbsp;'
  refreshPopupHeight()

  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]

  if (!tab.url) {
    return displayError('Not on sign in page')
  }

  if (tab.url.startsWith('about:')) {
    return displayError('Not on sign in page')
  }

  const hostname = (new URL(tab.url)).hostname.replace(reCommonPrefixes, '')

  unlockContainer.style.display = ''
  unlockMesage.textContent = hostname.charAt(0).toUpperCase() + hostname.slice(1)
  refreshPopupHeight()

  await wextTabs.executeScript({ file: '/filler.js' })
  const hasLogin = (await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_has_login__()` }))[0]

  if (!hasLogin) {
    return displayError('Not on sign in page')
  }
}

errorAppLink.addEventListener('click', async () => {
  await wextTabs.create({ active: true, url: `${APP_HOST}/` })
  hidePopup()
})

unlockForm.addEventListener('submit', async (ev) => {
  ev.preventDefault()

  const masterPassword = unlockInput.value

  unlockContainer.style.display = 'none'
  statusContainer.style.display = ''
  unlockError.textContent = ''

  refreshPopupHeight()

  if (state.kind === 'empty') {
    const tab = unwrap(await wextTabs.create({ active: false, url: `${APP_HOST}/#login` }))
    const tabId = unwrap(tab.id)

    await waitForComplete(tabId)

    const syncToken = unwrap(await wextTabs.executeScript(tabId, { code: 'window.localStorage.getItem("credentials")' }))[0] as string | undefined

    if (!syncToken) {
      await wextTabs.update(tabId, { active: true })
      return displayError('Please log in to Ctrlpanel')
    }

    await wextTabs.remove(tabId)

    state = core.init(syncToken)
  }

  if (state.kind === 'locked') {
    try {
      state = await core.unlock(state, masterPassword)
    } catch (err) {
      if (err.code === 'WRONG_MASTER_PASSWORD') {
        unlockContainer.style.display = ''
        statusContainer.style.display = 'none'
        unlockError.textContent = 'Wrong master password'
        refreshPopupHeight()
        return
      }

      throw err
    }
  }

  // The password was correct, remove it from the DOM now
  unlockInput.value = ''

  if (state.kind === 'unlocked') {
    state = await core.connect(state)
  }

  state = await core.sync(state)

  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]
  const hostname = (new URL(unwrap(tab.url))).hostname.replace(reCommonPrefixes, '')

  const data = core.getParsedEntries(state)
  const accounts = Object.keys(data.accounts).map(key => data.accounts[key])
  const account = accounts.find(acc => acc.hostname.replace(reCommonPrefixes, '') === hostname)

  if (!account) {
    return displayError('No account found')
  }

  try {
    await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_perform_login__(${JSON.stringify(account.handle)}, ${JSON.stringify(account.password)}, ${JSON.stringify(AUTO_SUBMIT)})` })
  } catch (_) {
    return displayError('Failed to fill')
  }

  hidePopup()
})
