const reCommonPrefixes = /^(account|accounts|app|auth|dashboard|login|signin|sso|www)\./

export default function stripCommonPrefixes (hostname: string) {
  return hostname.replace(reCommonPrefixes, '')
}
