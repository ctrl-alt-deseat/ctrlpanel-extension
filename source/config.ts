import unwrap = require('ts-unwrap')

declare const process: { env: { [key: string]: string } }

export const API_HOST = unwrap(process.env.API_HOST)
export const APP_HOST = unwrap(process.env.APP_HOST)
export const AUTO_SUBMIT = unwrap(process.env.AUTO_SUBMIT)
