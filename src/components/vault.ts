const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const DEFAULT_LENGTH = 16

export const DEFAULT_SYMBOLS = '!@#%_-+'

export interface GeneratePasswordOptions {
  masterKey: string
  platform: string
  length?: number
  symbols?: string
}

export async function generatePassword({
  masterKey,
  platform,
  length = DEFAULT_LENGTH,
  symbols = DEFAULT_SYMBOLS,
}: GeneratePasswordOptions): Promise<string> {
  if (!masterKey || !platform || length <= 0) {
    return ''
  }

  const encoder = new TextEncoder()
  const keyData = await crypto.subtle.importKey('raw',encoder.encode(masterKey),{ name: 'HMAC', hash: 'SHA-256' },false,['sign'])
  const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(platform))
  const digest = new Uint8Array(signature)
  const chars = Array.from(digest, (byte) => BASE62.charAt(byte % BASE62.length))

  chars[0] = UPPERCASE.charAt(digest[0]! % UPPERCASE.length)
  chars[1] = LOWERCASE.charAt(digest[1]! % LOWERCASE.length)
  chars[2] = DIGITS.charAt(digest[2]! % DIGITS.length)

  if (symbols) {
    const symbolPool = symbols || DEFAULT_SYMBOLS
    chars[3] = symbolPool.charAt(digest[3]! % symbolPool.length)
  }

  return chars.join('').slice(0, Math.trunc(length))
}
