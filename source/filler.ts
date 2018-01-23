import { getLoginTarget } from '@buttercup/locust'

window.__ctrlpanel_extension_perform_login__ = function (username: string, password: string, submit: boolean) {
  getLoginTarget()[submit ? 'login' : 'enterDetails'](username, password)
}
