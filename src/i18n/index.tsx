import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Lang, Text } from '../types'
import { en, type Key, type Plural, type PluralKey } from './en'
import { pl } from './pl'

const DICTS = { en, pl }

/** en-GB rather than en-US: day-first dates and a 24-hour clock. */
const LOCALE: Record<Lang, string> = { en: 'en-GB', pl: 'pl-PL' }

export function detectLang(): Lang {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  return langs.some((l) => l?.toLowerCase().startsWith('pl')) ? 'pl' : 'en'
}

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export function makeI18n(lang: Lang) {
  const dict = DICTS[lang]
  const locale = LOCALE[lang]
  const rules = new Intl.PluralRules(locale)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const nf = new Intl.NumberFormat(locale)
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  const t = (key: Key, vars?: Record<string, string | number>) => fill(dict[key], vars)

  const tp = (key: PluralKey, n: number) => {
    const forms = dict[key] as Plural
    const cat = rules.select(n) as keyof Plural
    return fill(forms[cat] ?? forms.other, { n: nf.format(n) })
  }

  /** Resolves built-in bilingual labels; user-entered strings pass through. */
  const text = (v: Text) => (typeof v === 'string' ? v : v[lang])

  const ago = (ts: number) => {
    const s = Math.round((ts - Date.now()) / 1000)
    const a = Math.abs(s)
    if (a < 45) return t('justNow')
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
    if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day')
    return dateFmt.format(ts)
  }

  const duration = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 60000))
    const h = Math.floor(total / 60)
    const m = total % 60
    return h ? t('hoursShort', { h, m }) : t('minutesShort', { n: m })
  }

  return {
    lang,
    locale,
    t,
    tp,
    text,
    ago,
    duration,
    num: (n: number) => nf.format(n),
    date: (ts: number) => dateFmt.format(ts),
    time: (ts: number) => timeFmt.format(ts),
    day: (ts: number) => dayFmt.format(ts),
  }
}

export type I18n = ReturnType<typeof makeI18n>

const Ctx = createContext<I18n>(makeI18n('en'))

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => makeI18n(lang), [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
