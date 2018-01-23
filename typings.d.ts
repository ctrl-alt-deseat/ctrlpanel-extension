interface Window {
  __ctrlpanel_extension_perform_login__: (username: string, password: string, submit: boolean) => void
}

declare module '@buttercup/locust' {
  export function getLoginTarget(): {
    login (username: string, password: string): Promise<void>
    enterDetails (username: string, password: string): Promise<void>
  }
}
