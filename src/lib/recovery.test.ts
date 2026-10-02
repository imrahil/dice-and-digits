import { describe, expect, it } from 'vitest'
import { WORDS } from '../data/words'
import { codeWords, deriveKey, fold, isCode, newCode, parseWords } from './recovery'

describe('recovery words', () => {
  it('the list has 256 short, distinct words in each language', () => {
    expect(WORDS).toHaveLength(256)

    const seen = new Map<string, number>()

    WORDS.forEach(([en, pl], i) => {
      for (const w of [en, pl]) {
        expect(w, w).toMatch(/^\p{Ll}{2,10}$/u) // one lowercase word, easy to type
        expect(seen.get(fold(w)) ?? i, `${w} reads like word ${seen.get(fold(w))}`).toBe(i)
        seen.set(fold(w), i)
      }
    })
  })

  it('a code is six words, shown in either language', () => {
    const code = newCode()

    expect(isCode(code)).toBe(true)
    expect(codeWords(code, 'en')).toHaveLength(6)
    expect(codeWords('0018ff000000', 'en')).toEqual(['cat', 'giraffe', 'smile', 'cat', 'cat', 'cat'])
    expect(codeWords('0018ff000000', 'pl')).toEqual(['kot', 'żyrafa', 'uśmiech', 'kot', 'kot', 'kot'])
  })

  it('typed words come back as the same code: any language, case, accents or separators', () => {
    const code = newCode()
    const [a, b, c] = [codeWords(code, 'en'), codeWords(code, 'pl'), codeWords(code, 'pl').map(fold)]

    expect(parseWords(a.join(' '))).toEqual({ code })
    expect(parseWords(b.join(', ').toUpperCase())).toEqual({ code })
    expect(parseWords(`  ${c.join('-')}\n`)).toEqual({ code })
    expect(parseWords([a[0], b[1], a[2], b[3], a[4], b[5]].join(' '))).toEqual({ code })
    expect(parseWords('Żółw zolw ŻÓŁW kot cat Kot')).toEqual(parseWords('turtle turtle turtle cat cat cat'))
  })

  it('says which word is wrong, or how many were typed', () => {
    expect(parseWords('tiger banana rockett cat cat cat')).toEqual({ error: 'unknown', word: 'rockett' })
    expect(parseWords('tiger banana')).toEqual({ error: 'count', count: 2 })
    expect(parseWords('')).toEqual({ error: 'count', count: 0 })
  })

  it('the key is stretched from the code: the same every time, different per code', async () => {
    const k1 = await deriveKey('0018ff000000')

    expect(k1.id).toMatch(/^[0-9a-f]{32}$/)
    expect(k1.secret).toMatch(/^[0-9a-f]{64}$/)
    expect(await deriveKey('0018ff000000')).toEqual(k1)
    expect((await deriveKey('0018ff000001')).id).not.toBe(k1.id)
  })
})
