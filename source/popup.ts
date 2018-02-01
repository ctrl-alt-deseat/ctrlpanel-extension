/* global safari */

import unwrap = require('ts-unwrap')

import * as wextTabs from '@wext/tabs'

import { API_HOST, APP_HOST, AUTO_SUBMIT } from './config'
import * as CtrlpanelExtension from './extension'
import stripCommonPrefixes from './lib/strip-common-prefixes'

const EMPTY_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
const NO_BREAK_SPACE = String.fromCodePoint(0x00A0)

const hasSafariGlobal = (typeof safari === 'object')

const unlockContainer = unwrap(document.querySelector<HTMLDivElement>('div.unlock-container'))
const unlockForm = unwrap(document.querySelector<HTMLFormElement>('form.unlock-form'))
const unlockFavicon = unwrap(document.querySelector<HTMLImageElement>('img.unlock-favicon'))
const unlockHostname = unwrap(document.querySelector<HTMLDivElement>('div.unlock-hostname'))
const unlockInput = unwrap(document.querySelector<HTMLInputElement>('input.unlock-input'))
const unlockError = unwrap(document.querySelector<HTMLDivElement>('div.unlock-error'))

const loadingContainer = unwrap(document.querySelector<HTMLDivElement>('div.loading-container'))

const errorContainer = unwrap(document.querySelector<HTMLDivElement>('div.error-container'))
const errorMessage = unwrap(document.querySelector<HTMLDivElement>('div.error-message'))
const errorAppLink = unwrap(document.querySelector<HTMLAnchorElement>('div.error-app-link a'))

interface EmptyState {
  kind: 'empty'
}

interface LockedState {
  kind: 'locked',
  hostname: string
  errorMessage?: string
}

interface LoadingState {
  kind: 'loading'
}

interface ErrorState {
  kind: 'error'
  message: string
}

type State = EmptyState | LockedState | LoadingState | ErrorState

setTimeout(() => unlockInput.focus(), 200)

const originalHeight = document.body.clientHeight

function refreshPopupHeight () {
  if (hasSafariGlobal) safari.self.height = document.body.clientHeight
}

function hidePopup () {
  return (hasSafariGlobal ? safari.self.hide() : window.close())
}

let state: State = { kind: 'empty' }
function render (newState?: State) {
  if (newState) state = newState

  unlockContainer.style.display = (state.kind === 'locked' ? '' : 'none')
  loadingContainer.style.display = (state.kind === 'loading' ? '' : 'none')
  errorContainer.style.display = (state.kind === 'error' ? '' : 'none')

  unlockHostname.textContent = (state.kind === 'locked' ? (state.hostname.charAt(0).toUpperCase() + state.hostname.slice(1)) : NO_BREAK_SPACE)
  unlockFavicon.src = (state.kind === 'locked' ? `https://api.ind3x.io/v1/domains/${state.hostname}/icon` : EMPTY_IMAGE_SRC)
  unlockError.textContent = (state.kind === 'locked' ? (state.errorMessage || '') : '')

  errorMessage.textContent = (state.kind === 'error' ? state.message : '')

  refreshPopupHeight()
}

// Safari doesn't reset the popup when it closes
if (hasSafariGlobal) {
  window.addEventListener('blur', () => {
    setTimeout(() => {
      safari.self.height = originalHeight
      unlockInput.value = ''
      render({ kind: 'empty' })
    }, 280)
  })

  window.addEventListener('focus', onPopupOpen)
} else {
  onPopupOpen()
}

async function onPopupOpen () {
  render({ kind: 'empty' })

  if (await CtrlpanelExtension.needCredentials()) {
    return render({ kind: 'error', message: 'Please log in to Ctrlpanel' })
  }

  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]

  if (!tab.url) {
    return render({ kind: 'error', message: 'Not on sign in page' })
  }

  if (tab.url.startsWith('about:')) {
    return render({ kind: 'error', message: 'Not on sign in page' })
  }

  const hostname = stripCommonPrefixes((new URL(tab.url)).hostname)

  await wextTabs.executeScript({ file: '/filler.js' })
  const hasLogin = (await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_has_login__()` }))[0]

  if (!hasLogin) {
    return render({ kind: 'error', message: 'Not on sign in page' })
  }

  if (await CtrlpanelExtension.needMasterPassword()) {
    return render({ kind: 'locked', hostname: hostname })
  }

  return fillAccount()
}

errorAppLink.addEventListener('click', async () => {
  await wextTabs.create({ active: true, url: `${APP_HOST}/` })
  hidePopup()
})

unlockForm.addEventListener('submit', async (ev) => {
  ev.preventDefault()

  if (state.kind !== 'locked') {
    throw new Error(`Unexpected state: ${state.kind}`)
  }

  const { hostname } = state

  render({ kind: 'loading' })

  const masterPassword = unlockInput.value

  try {
    await CtrlpanelExtension.unlock(masterPassword)
  } catch (err) {
    if (err.code === 'WRONG_MASTER_PASSWORD') {
      return render({ kind: 'locked', hostname, errorMessage: 'Wrong master password' })
    }

    throw err
  }

  // The password was correct, cache it and remove it from the DOM now
  unlockInput.value = ''

  return fillAccount()
})

async function fillAccount () {
  await CtrlpanelExtension.sync()

  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]
  const { hostname } = (new URL(unwrap(tab.url)))
  const account = await CtrlpanelExtension.getAccountForHostname(hostname)

  if (!account) {
    return render({ kind: 'error', message: 'No account found' })
  }

  try {
    await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_perform_login__(${JSON.stringify(account.handle)}, ${JSON.stringify(account.password)}, ${JSON.stringify(AUTO_SUBMIT)})` })
  } catch (_) {
    return render({ kind: 'error', message: 'Failed to fill' })
  }

  hidePopup()
}
