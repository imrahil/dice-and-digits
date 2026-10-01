import { describe, expect, it } from 'vitest'
import { en } from './en'
import { pl } from './pl'
import { makeI18n } from './index'

describe('i18n', () => {
  it('Polish has exactly the English keys', () => {
    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort())
  })

  it('placeholders match between languages', () => {
    const vars = (s: unknown) => JSON.stringify(s).match(/\{\w+\}/g)?.sort() ?? []

    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect([k, ...new Set(vars(pl[k]))]).toEqual([k, ...new Set(vars(en[k]))])
    }
  })

  it('uses Polish plural forms', () => {
    const { tp } = makeI18n('pl')

    expect(tp('nGames', 1)).toBe('1 gra')
    expect(tp('nGames', 3)).toBe('3 gry')
    expect(tp('nGames', 5)).toBe('5 gier')
    expect(tp('nGames', 22)).toBe('22 gry')
    expect(tp('nGames', 12)).toBe('12 gier')
    expect(tp('nRounds', 2)).toBe('2 rundy')
    expect(tp('nWins', 5)).toBe('5 wygranych')
  })

  it('uses English plural forms', () => {
    const { tp } = makeI18n('en')

    expect(tp('nGames', 1)).toBe('1 game')
    expect(tp('nGames', 2)).toBe('2 games')
  })

  it('resolves bilingual labels', () => {
    expect(makeI18n('pl').text({ en: 'Rounds', pl: 'Rundy' })).toBe('Rundy')
    expect(makeI18n('en').text('Custom')).toBe('Custom')
  })
})
