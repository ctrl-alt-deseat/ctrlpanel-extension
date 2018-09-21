interface Window {
  __ctrlpanel_extension_available_fields__: () => { handle: boolean, password: boolean }
  __ctrlpanel_extension_fill_field__: (field: 'handle' | 'password', value: string) => void
  __ctrlpanel_extension_get_filled_handle__: () => string
  __ctrlpanel_extension_perform_login__: (handle: string, password: string, submit: boolean) => void
}

declare module '@buttercup/locust' {
  export function getLoginTarget(): {
    login (username: string, password: string): Promise<void>
    enterDetails (username: string, password: string): Promise<void>
    fillUsername (username: string): Promise<void>
    fillPassword (password: string): Promise<void>
    usernameField: HTMLInputElement | null
    passwordField: HTMLInputElement | null
  }
}

interface Safari {
  self: {
    height: number
    hide: () => void
  }
}

declare const safari: Safari | undefined
