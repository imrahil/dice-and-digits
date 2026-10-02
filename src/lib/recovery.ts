import { WORDS } from '../data/words'
import type { Lang } from '../types'

/**
 * Recovery codes for a personal backup: six words a child can remember.
 *
 * The code is six random bytes; each byte picks a word from WORDS, in English
 * or Polish. That's 48 bits, so the group key is stretched from it with
 * PBKDF2 on the phone: the server only ever sees the derived id and secret,
 * and a leaked database can't be searched for codes cheaply.
 */

export const CODE_WORDS = 6

const ITERATIONS = 200_000
const SALT = 'dice-and-digits:backup:v1'

/** A code is kept as hex: 12 characters, 2 per word. */
export type Code = string

export const isCode = (s: string): s is Code => /^[0-9a-f]{12}$/.test(s)

export function newCode(): Code {
  return toHex(crypto.getRandomValues(new Uint8Array(CODE_WORDS)))
}

export function codeWords(code: Code, lang: Lang): string[] {
  const i = lang === 'pl' ? 1 : 0

  return (code.match(/../g) ?? []).map((h) => WORDS[parseInt(h, 16)][i])
}

/** Lowercase, Polish letters dropped: "Żółw" and "zolw" are the same word. */
export const fold = (word: string) =>
  word
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

let lookup: Map<string, number> | undefined

function wordIndex(word: string): number | undefined {
  lookup ??= new Map(WORDS.flatMap(([en, pl], i) => [[fold(en), i], [fold(pl), i]] as [string, number][]))

  return lookup.get(fold(word))
}

export type Parsed = { code: Code } | { error: 'count'; count: number } | { error: 'unknown'; word: string }

/** Typed words → code. Any language, case, accents, spaces, commas or dashes. */
export function parseWords(input: string): Parsed {
  const words = input.split(/[^\p{L}]+/u).filter(Boolean)

  for (const w of words) {
    if (wordIndex(w) === undefined) {
      return { error: 'unknown', word: w }
    }
  }

  if (words.length !== CODE_WORDS) {
    return { error: 'count', count: words.length }
  }

  return { code: toHex(Uint8Array.from(words, (w) => wordIndex(w)!)) }
}

/** The backup's group id (32 hex) and secret, stretched from the code. */
export async function deriveKey(code: Code): Promise<{ id: string; secret: string }> {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS }, base, 384),
  )

  return { id: toHex(bits.slice(0, 16)), secret: toHex(bits.slice(16)) }
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
