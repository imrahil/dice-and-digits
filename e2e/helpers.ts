import { devices, type Browser, type Page } from '@playwright/test'
import type { Session } from '../src/types'

/** A separate "phone": its own browser context, so its own localStorage. */
export async function newPhone(browser: Browser, opts: { locale?: string; colorScheme?: 'light' | 'dark' } = {}) {
  // Extra contexts don't inherit the project's `use`, so repeat it here.
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
    serviceWorkers: 'block',
    locale: opts.locale ?? 'pl-PL',
    colorScheme: opts.colorScheme ?? 'light',
  })
  const page = await context.newPage()

  return page
}

export const button = (page: Page, name: string | RegExp, exact = false) => page.getByRole('button', { name, exact })

export const dialog = (page: Page) => page.getByRole('dialog')

/** Type on the app's own keypad ("-" toggles the sign). */
export async function press(page: Page, keys: string) {
  for (const k of keys) {
    await (k === '-' ? button(page, '±') : button(page, k, true)).click()
  }
}

/** Open the setup screen of a built-in game and add players by name. */
export async function setUpGame(page: Page, gameId: string, players: string[] = []) {
  await page.goto(`#/new/${encodeURIComponent(gameId)}`)

  for (const name of players) {
    await page.getByPlaceholder(/Imię nowego gracza|New player name/).fill(name)
    await page.keyboard.press('Enter')
  }
}

export async function startGame(page: Page, gameId: string, players: string[] = []) {
  await setUpGame(page, gameId, players)
  await button(page, /Zacznij grę|Start game/).click()
  await page.waitForURL(/#\/play\//)
}

export async function finishGame(page: Page) {
  await button(page, /Zakończ grę|Finish game/).last().click()
  await dialog(page).getByRole('button', { name: /Zakończ grę|Finish game/ }).click()
  await page.waitForURL(/#\/result\//)
}

/** Sessions straight from the phone's storage, for asserting on stored data. */
export async function sessions(page: Page): Promise<Session[]> {
  return page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('dice-digits:sessions') ?? '{}')))
}

export async function session(page: Page, gameId: string): Promise<Session> {
  const all = await sessions(page)
  const found = all.find((s) => s.gameId === gameId && !s.deleted)

  if (!found) {
    throw new Error(`no session for ${gameId}`)
  }

  return found
}

export const seatId = (s: Session, name: string) => s.seats.find((x) => x.name === name)!.id

/** Empty score-sheet cells this phone may tap, in reading order. */
export const emptyCells = (page: Page) => page.locator('main button:not([disabled])').filter({ hasText: '–' })

/** Start sharing the current game live; returns its 6-character code. */
export async function goLive(page: Page): Promise<string> {
  await button(page, 'Menu').click()
  await button(page, /Udostępnij na żywo|Share live/).click()
  await dialog(page).getByText(/Zeskanuj|Scan/).waitFor()

  const live = await page.evaluate(() => JSON.parse(localStorage.getItem('dice-digits:live') ?? '{}'))
  const codes = Object.values(live) as { code: string }[]

  return codes[codes.length - 1].code
}
