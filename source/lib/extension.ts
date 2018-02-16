import wextRuntime = require('@wext/runtime')

function remoteCall<T> (method: string, ...args: any[]): Promise<T> {
  return wextRuntime.sendMessage({ method, args }).then((msg: any) => {
    if (msg.error) {
      let err: any = new Error(msg.error.message)
      if (msg.error.code) err.code = msg.error.code
      throw err
    }

    return msg.result
  })
}

export function needCredentials () {
  return remoteCall<boolean>('needCredentials')
}

export function needMasterPassword () {
  return remoteCall<boolean>('needMasterPassword')
}

export function unlock (masterPassword: string) {
  return remoteCall<void>('unlock', masterPassword)
}

export function sync () {
  return remoteCall<void>('sync')
}

export type AccountResult = (
  { id: string, source: 'account', handle: string, hostname: string, password: string, score: number } |
  { id: string, source: 'inbox', email: string, hostname: string, score: number }
)

export function getAccountsForHostname (hostname: string) {
  return remoteCall<AccountResult[]>('getAccountsForHostname', hostname)
}

export function seed (handle: string, secretKey: string, masterPassword: string) {
  return remoteCall<void>('seed', handle, secretKey, masterPassword)
}

export function signalActivity () {
  return remoteCall<void>('signalActivity')
}

export function lock () {
  return remoteCall<void>('lock')
}

export function importInboxEntry (inboxEntryId: string, handle: string, hostname: string) {
  return remoteCall<void>('importInboxEntry', inboxEntryId, handle, hostname)
}

export function promptInboxEntry (hostname: string, handle: string) {
  return remoteCall<void>('promptInboxEntry', hostname, handle)
}
