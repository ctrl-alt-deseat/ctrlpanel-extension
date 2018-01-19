import Locust from '@buttercup/locust'

window.__ctrlpanel_extension_perform_login__ = function (username: string, password: string, submit: boolean) {
  Locust.getLoginTarget()[submit ? 'login' : 'enterDetails'](username, password)
}
