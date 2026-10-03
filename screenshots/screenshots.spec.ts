import { devices, expect, test, type Page } from '@playwright/test'
import { BUILTIN_GAMES } from '../src/data/presets'
import type { Player, Rules, Seat, Session } from '../src/types'
import { button, dialog, goLive, press } from '../e2e/helpers'

// Generates the README screenshots from seeded demo data. Not a test: it
// asserts nothing about the app, it only drives it to a good-looking state.

const OUT = 'docs/screenshots'
const MIN = 60_000
const DAY = 24 * 60 * MIN

const NAMES: [string, string][] = [
  ['Anna', '#e4572e'],
  ['Bartek', '#2e86de'],
  ['Cleo', '#2a9d5c'],
  ['Darek', '#f2b134'],
]

const players: Record<string, Player> = Object.fromEntries(
  NAMES.map(([name, color], i) => [`p${i}`, { id: `p${i}`, name, color, updatedAt: 1 }]),
)

const rulesOf = (id: string): Rules => {
  const g = BUILTIN_GAMES.find((x) => x.id === id)!

  return {
    name: g.name,
    mode: g.mode,
    lowWins: g.lowWins,
    target: g.target,
    categories: g.categories,
    bonus: g.bonus,
    steps: g.steps,
    zeroSum: g.zeroSum,
    timer: g.timer,
  }
}

const seats = (n: number, pawns?: string[]): Seat[] =>
  NAMES.slice(0, n).map(([name, color], i) => ({ id: `p${i}`, name, color, pawn: pawns?.[i] }))

// A fixed "today" (and time zone), so the header date and every relative date
// are the same on every run and the PNGs only change when the UI does.
const now = Date.parse('2026-03-14T18:30:00+01:00')
const TIME_ZONE = 'Europe/Warsaw'

function session(id: string, gameId: string, n: number, extra: Partial<Session> = {}): Session {
  const g = BUILTIN_GAMES.find((x) => x.id === gameId)!

  return {
    id,
    gameId,
    emoji: g.emoji,
    rules: rulesOf(gameId),
    seats: seats(n),
    rounds: [],
    log: [],
    sheet: {},
    startedAt: now - 40 * MIN,
    updatedAt: now,
    ...extra,
  }
}

const finished = (s: Session, daysAgo: number, mins = 45): Session => ({
  ...s,
  startedAt: now - daysAgo * DAY - mins * MIN,
  finishedAt: now - daysAgo * DAY,
  updatedAt: now - daysAgo * DAY,
})

/** A counter log: `scores[i]` taps of `steps` for player i, spread over the game. */
function tapLog(scores: number[], start: number): Session['log'] {
  const log: Session['log'] = []
  let t = start

  scores.forEach((total, i) => {
    for (let left = total; left > 0; ) {
      const d = left >= 2 && (left + i) % 3 === 0 ? 2 : 1

      log.push({ p: `p${i}`, d, t: (t += 40_000) })
      left -= d
    }
  })

  return log.sort((a, b) => a.t - b.t)
}

const wonders = {
  military: [6, 0, 3, 9],
  coins: [12, 9, 15, 6],
  wonder: [10, 14, 7, 5],
  civil: [18, 11, 20, 14],
  science: [21, 15, 8, 28],
  commerce: [6, 9, 12, 3],
  guilds: [8, 16, 5, 11],
}

const sheetOf = (cols: Record<string, number[]>, rows: number) =>
  Object.fromEntries(
    Object.entries(cols).map(([cat, v]) => [cat, Object.fromEntries(v.slice(0, rows).map((x, i) => [`p${i}`, x]))]),
  )

const catan = session('s-catan', 'builtin:catan', 4, {
  seats: seats(4, ['#d7263d', '#1f6fd1', '#2a9d5c', '#f07f22']),
  log: tapLog([7, 5, 8, 4], now - 38 * MIN),
})

const thousand = session('s-1000', 'builtin:1000', 3, {
  rounds: [
    { p0: 120, p1: 60, p2: 0 },
    { p0: -100, p1: 140, p2: 80 },
    { p0: 200, p1: 0, p2: 120 },
    { p0: 60, p1: -120, p2: 100 },
    { p0: 140, p1: 180, p2: 0 },
  ],
})

const sevenWonders = session('s-7w', 'builtin:7wonders', 4, {
  sheet: sheetOf({ ...wonders, guilds: [] }, 4),
})

const done7w = finished(session('d-7w', 'builtin:7wonders', 4, { sheet: sheetOf(wonders, 4) }), 0, 52)
const done1000 = finished(
  session('d-1000', 'builtin:1000', 3, {
    rounds: [
      { p0: 120, p1: 60, p2: 100 },
      { p0: 200, p1: 140, p2: -100 },
      { p0: 240, p1: 300, p2: 180 },
      { p0: 280, p1: 260, p2: 160 },
      { p0: 200, p1: 260, p2: 240 },
    ],
  }),
  2,
  70,
)
const doneCatan = finished(
  session('d-catan', 'builtin:catan', 4, { log: tapLog([10, 7, 9, 6], now - 5 * DAY - 90 * MIN) }),
  5,
  95,
)
const doneCatan2 = finished(
  session('d-catan2', 'builtin:catan', 3, { log: tapLog([8, 6, 10], now - 9 * DAY - 80 * MIN) }),
  9,
  80,
)
const done7w2 = finished(
  session('d-7w2', 'builtin:7wonders', 3, { sheet: sheetOf({ ...wonders, military: [3, 6, 0] }, 3) }),
  12,
  50,
)

const HOME = 'https://dicedigits.fun'
const LOCAL = 'http://localhost:4173'

const seed = (list: Session[], lang: 'en' | 'pl') => ({
  'dice-digits:players': players,
  'dice-digits:sessions': Object.fromEntries(list.map((s) => [s.id, s])),
  'dice-digits:settings': { lang, theme: 'light', skin: 'arcade', keepAwake: true, haptics: true },
})

async function phone(browser: Parameters<Parameters<typeof test>[2]>[0]['browser'], lang: 'en' | 'pl', list: Session[]) {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    deviceScaleFactor: 2,
    baseURL: HOME,
    serviceWorkers: 'block',
    locale: lang === 'pl' ? 'pl-PL' : 'en-GB',
    timezoneId: TIME_ZONE,
  })

  // Dates read this; timers keep running, so animations still play.
  await context.clock.setFixedTime(now)

  // Serve the local build under the public domain, so the live-game link and
  // QR code in the screenshots read dicedigits.fun, not localhost. The worker
  // allows that origin, and browsers treat http://localhost as secure.
  await context.route(`${HOME}/**`, async (route) => {
    await route.fulfill({ response: await route.fetch({ url: route.request().url().replace(HOME, LOCAL) }) })
  })
  // The dice: a fixed sequence, so every run draws the same picture.
  await context.addInitScript(() => {
    let x = 7

    Math.random = () => ((x = (x * 48271) % 2147483647) / 2147483647)
  })

  const page = await context.newPage()

  await page.goto('/')
  await page.evaluate((data) => {
    for (const [k, v] of Object.entries(data)) {
      localStorage.setItem(k, JSON.stringify(v))
    }
  }, seed(list, lang))
  await page.reload()

  return page
}

async function shot(page: Page, lang: string, name: string) {
  // Let fonts, route transitions and the confetti settle.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${lang}/${name}.png` })
}

for (const lang of ['en', 'pl'] as const) {
  test(`screenshots (${lang})`, async ({ browser }) => {
    const page = await phone(browser, lang, [
      catan,
      thousand,
      sevenWonders,
      done7w,
      done1000,
      doneCatan,
      doneCatan2,
      done7w2,
    ])

    await page.goto('#/')
    await shot(page, lang, '01-home')

    await page.goto('#/play/s-catan')
    await shot(page, lang, '02-counter')

    await page.goto('#/play/s-1000')
    await shot(page, lang, '03-rounds')

    await page.goto('#/play/s-7w')
    await shot(page, lang, '04-sheet')

    await page.goto('#/result/d-7w')
    await shot(page, lang, '05-result')

    await page.goto('#/stats')
    await shot(page, lang, '06-stats')

    await page.goto('#/history')
    await shot(page, lang, '07-history')

    await page.goto('#/tools')
    await page.getByText(/Tap to roll|Dotknij, by rzucić/i).click()
    await page.waitForTimeout(1500)
    await shot(page, lang, '08-tools')

    // The own number pad, with a negative score on its way in.
    await page.goto('#/play/s-1000')
    await button(page, /^(Round|Runda) \d/).click()
    await press(page, '-100')
    await shot(page, lang, '09-keypad')
    await page.keyboard.press('Escape')

    // Live: the scorekeeper's QR code, with one friend already in.
    await page.goto('#/play/s-7w')

    const code = await goLive(page)
    const friend = await phone(browser, lang, [])

    await friend.goto(`#/live/${code}`)
    await friend.getByRole('button', { name: /Bartek/ }).click()
    await expect(dialog(page).getByText(/1 (phone|telefon)/)).toBeVisible()
    await shot(page, lang, '10-live')

    await friend.context().close()
    await page.context().close()
  })
}
