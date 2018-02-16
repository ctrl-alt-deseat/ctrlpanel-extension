import { getLoginTarget } from '@linusu/locust'

window.__ctrlpanel_extension_available_fields__ = function () {
  const loginTarget = getLoginTarget()

  return {
    handle: Boolean(loginTarget && loginTarget.usernameField),
    password: Boolean(loginTarget && loginTarget.passwordField)
  }
}

window.__ctrlpanel_extension_fill_field__ = function (field: 'handle' | 'password', value: string) {
  getLoginTarget()[field === 'handle' ? 'fillUsername' : 'fillPassword'](value)
}

window.__ctrlpanel_extension_get_filled_handle__ = function () {
  const loginTarget = getLoginTarget()

  return (loginTarget && loginTarget.usernameField && loginTarget.usernameField.value) || ''
}

window.__ctrlpanel_extension_perform_login__ = function (handle: string, password: string, submit: boolean) {
  getLoginTarget()[submit ? 'login' : 'enterDetails'](handle, password)
}
