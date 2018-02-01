import { onUpdated } from '@wext/tabs'

export default function waitForComplete (targetTabId: number) {
  return new Promise((resolve, reject) => {
    onUpdated.addListener(function listener (tabId, changeInfo) {
      if (tabId === targetTabId && changeInfo.status === 'complete') {
        onUpdated.removeListener(listener)
        resolve()
      }
    })
  })
}
