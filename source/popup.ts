/* global safari */

import unwrap = require('ts-unwrap')

import * as wextTabs from '@wext/tabs'
import copy = require('clipboard-copy')
import stripCommonPrefixes = require('@ctrlpanel/strip-common-prefixes')

import { APP_HOST, AUTO_SUBMIT } from './lib/config'
import * as CtrlpanelExtension from './lib/extension'

const EMPTY_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
const NO_BREAK_SPACE = String.fromCodePoint(0x00A0)
const BULLET = String.fromCodePoint(0x2022)
const CHECKMARK = String.fromCodePoint(0x2713)

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

const accountList = unwrap(document.querySelector<HTMLDivElement>('div.account-list'))
const accountContainer = unwrap(document.querySelector<HTMLDivElement>('div.account-container'))
const accountTemplate = unwrap(accountContainer.parentNode).removeChild(accountContainer)

interface AvailableFields {
  handle: boolean
  password: boolean
}

interface EmptyState {
  kind: 'empty'
}

interface LockedState {
  kind: 'locked'
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

interface AccountsState {
  kind: 'accounts'
  hostname: string
  accounts: CtrlpanelExtension.AccountResult[]
  availableFields: AvailableFields
}

type State = EmptyState | LockedState | LoadingState | ErrorState | AccountsState

const originalHeight = document.body.clientHeight

function refreshPopupHeight () {
  if (typeof safari === 'object') safari.self.height = document.body.clientHeight
}

function hidePopup () {
  return (typeof safari === 'object' ? safari.self.hide() : window.close())
}

function upperCaseFirst (input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

function renderAction (el: HTMLSpanElement, text: string, onClick: () => void) {
  let timeoutId: any = null

  function indicateSuccess () {
    function onTimeout () {
      el.textContent = text
      timeoutId = null
    }

    if (timeoutId) clearTimeout(timeoutId)
    el.textContent = CHECKMARK
    timeoutId = setTimeout(onTimeout, 2400)
  }

  el.textContent = text
  el.addEventListener('click', () => { onClick(); indicateSuccess() })
}

function renderAccount (data: CtrlpanelExtension.AccountResult, availableFields: AvailableFields, currentHostname: string) {
  const container = accountTemplate.cloneNode(true) as HTMLDivElement
  const favicon = unwrap(container.querySelector<HTMLImageElement>('img.account-favicon'))
  const login = unwrap(container.querySelector<HTMLDivElement>('div.account-login'))
  const hostname = unwrap(container.querySelector<HTMLDivElement>('div.account-hostname'))
  const handleValue = unwrap(container.querySelector<HTMLSpanElement>('div.account-handle .value'))
  const handleAction = unwrap(container.querySelector<HTMLSpanElement>('div.account-handle .action'))
  const passwordContainer = unwrap(container.querySelector<HTMLDivElement>('div.account-password'))
  const passwordValue = unwrap(container.querySelector<HTMLSpanElement>('div.account-password .value'))
  const passwordAction = unwrap(container.querySelector<HTMLSpanElement>('div.account-password .action'))
  const newPasswordButton = unwrap(container.querySelector<HTMLDivElement>('div.account-new-password'))

  hostname.textContent = upperCaseFirst(stripCommonPrefixes(data.hostname))
  favicon.src = `https://api.ind3x.io/v1/domains/${data.hostname}/icon`

  const handle = (data.source === 'account' ? data.handle : data.email)
  handleValue.textContent = handle

  if (availableFields.handle) {
    renderAction(handleAction, 'fill', () => fillField('handle', handle))
  } else {
    renderAction(handleAction, 'copy', () => copy(handle))
  }

  if (data.source === 'account') {
    passwordContainer.style.display = ''
    passwordValue.textContent = data.password.replace(/./g, BULLET)

    if (availableFields.password) {
      renderAction(passwordAction, 'fill', () => fillField('password', data.password))
    } else {
      renderAction(passwordAction, 'copy', () => copy(data.password))
    }
  } else {
    newPasswordButton.style.display = ''
    newPasswordButton.addEventListener('click', async () => {
      render({ kind: 'loading' })

      try {
        await CtrlpanelExtension.importInboxEntry(data.id, handle, currentHostname)
        const accounts = await CtrlpanelExtension.getAccountsForHostname(currentHostname)
        render({ kind: 'accounts', hostname: currentHostname, accounts, availableFields })
      } catch (err) {
        render({ kind: 'error', message: String(err) })
      }
    })
  }

  if (data.source === 'account' && availableFields.handle && availableFields.password) {
    login.style.display = ''
    login.addEventListener('click', () => fillAccount(data))
  }

  return container
}

let state: State = { kind: 'empty' }
function render (newState?: State) {
  if (newState) state = newState

  unlockContainer.style.display = (state.kind === 'locked' ? '' : 'none')
  loadingContainer.style.display = (state.kind === 'loading' ? '' : 'none')
  errorContainer.style.display = (state.kind === 'error' ? '' : 'none')
  accountList.style.display = (state.kind === 'accounts' ? '' : 'none')

  unlockHostname.textContent = (state.kind === 'locked' ? upperCaseFirst(state.hostname) : NO_BREAK_SPACE)
  unlockFavicon.src = (state.kind === 'locked' ? `https://api.ind3x.io/v1/domains/${state.hostname}/icon` : EMPTY_IMAGE_SRC)
  unlockError.textContent = (state.kind === 'locked' ? (state.errorMessage || '') : '')

  errorMessage.textContent = (state.kind === 'error' ? state.message : '')

  accountList.innerHTML = ''
  if (state.kind === 'accounts') {
    for (const acc of state.accounts) accountList.appendChild(renderAccount(acc, state.availableFields, state.hostname))
  }

  if (newState && newState.kind === 'locked') {
    unlockInput.focus()
  }

  refreshPopupHeight()
}

// Safari doesn't reset the popup when it closes
if (typeof safari === 'object') {
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

  if (tab.url.startsWith('chrome:')) {
    return render({ kind: 'error', message: 'Not on sign in page' })
  }

  const hostname = stripCommonPrefixes((new URL(tab.url)).hostname)

  if (await CtrlpanelExtension.needMasterPassword()) {
    return render({ kind: 'locked', hostname })
  }

  await displayAccounts(hostname)
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

  render({ kind: 'loading' })

  const tab = (await wextTabs.query({ active: true, currentWindow: true }))[0]
  const hostname = stripCommonPrefixes(new URL(unwrap(tab.url)).hostname)

  try {
    await CtrlpanelExtension.unlock(unlockInput.value)
  } catch (err) {
    if (err.code === 'WRONG_MASTER_PASSWORD') {
      return render({ kind: 'locked', hostname, errorMessage: 'Wrong master password' })
    }

    throw err
  }

  // The password was correct, remove it from the DOM now
  unlockInput.value = ''

  await displayAccounts(hostname)
})

async function displayAccounts (hostname: string) {
  await wextTabs.executeScript({ file: '/filler.js' })
  const availableFields = (await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_available_fields__()` }))[0] as AvailableFields

  const cachedAccounts = await CtrlpanelExtension.getAccountsForHostname(hostname)

  if (cachedAccounts.length > 0) {
    render({ kind: 'accounts', hostname, accounts: cachedAccounts, availableFields })
  }

  await CtrlpanelExtension.sync()

  const accounts = await CtrlpanelExtension.getAccountsForHostname(hostname)

  if (accounts.length === 0) {
    return render({ kind: 'error', message: 'No account found' })
  }

  render({ kind: 'accounts', hostname, accounts, availableFields })
}

async function fillField (field: keyof AvailableFields, value: string) {
  try {
    await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_fill_field__(${JSON.stringify(field)}, ${JSON.stringify(value)})` })
  } catch (_) { /* ignore */ }
}

async function fillAccount (account: CtrlpanelExtension.AccountResult) {
  if (account.source === 'inbox') throw new Error('Cannot fill inbox entries')

  try {
    await wextTabs.executeScript({ code: `window.__ctrlpanel_extension_perform_login__(${JSON.stringify(account.handle)}, ${JSON.stringify(account.password)}, ${JSON.stringify(AUTO_SUBMIT)})` })
  } catch (_) {
    return render({ kind: 'error', message: 'Failed to fill' })
  }

  hidePopup()
}
