interface Window {
  __ctrlpanel_extension_has_login__: () => boolean
  __ctrlpanel_extension_perform_login__: (username: string, password: string, submit: boolean) => void
}

declare module '@buttercup/locust' {
  export function getLoginTarget(): {
    login (username: string, password: string): Promise<void>
    enterDetails (username: string, password: string): Promise<void>
  }
}

interface Safari {
  self: {
    height: number
    hide: () => void
  }
}

declare const safari: Safari | undefined
