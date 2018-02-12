const reCommonPrefixes = /^(account|accounts|app|auth|dashboard|id|login|secure|signin|sso|www)\./

export default function stripCommonPrefixes (hostname: string) {
  return hostname.replace(reCommonPrefixes, '')
}
