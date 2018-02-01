const reCommonPrefixes = /^(account|accounts|app|dashboard|login|signin|www)\./

export default function stripCommonPrefixes (hostname: string) {
  return hostname.replace(reCommonPrefixes, '')
}
