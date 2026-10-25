import { expect, test } from '@playwright/test'
import { button, dialog, emptyCells, finishGame, press, seatId, session, setUpGame, startGame } from './helpers'

// One phone, no cloud: every scoring mode from setup to stats.

test('counter game: taps, keypad, undo, finish, history and stats', async ({ page }) => {
  await startGame(page, 'builtin:catan', ['Anna', 'Bartek'])

  const plus = page.locator('main button:has(svg.lucide-plus)')

  await plus.nth(0).click()
  await plus.nth(0).click()
  await plus.nth(0).click()
  await button(page, '+2').nth(1).click()

  // Custom amount through the keypad on Bartek's total.
  await page.getByRole('button', { name: 'Inna wartość' }).nth(1).click()
  await press(page, '5')
  await dialog(page).getByRole('button', { name: 'Dodaj' }).click()

  await button(page, 'Cofnij').click() // takes back the +5

  const s = await session(page, 'builtin:catan')

  expect(s.log.map((e) => e.d)).toEqual([1, 1, 1, 2]) // Anna 3, Bartek 2

  await finishGame(page)
  await expect(page.getByText('Zwycięzca')).toBeVisible()
  await expect(page.locator('main')).toContainText('Anna')

  await page.goto('#/history')
  await expect(page.locator('main')).toContainText('Wygrywa')

  await page.goto('#/stats')
  await expect(page.locator('main')).toContainText('Ranking')
  await expect(page.locator('main')).toContainText('Bartek')
})

test('remembers the last lineup for the next game', async ({ page }) => {
  await startGame(page, 'builtin:uno', ['Ola', 'Piotr'])
  await setUpGame(page, 'builtin:uno')
  await expect(page.locator('ol')).toContainText('Ola')
  await expect(page.locator('ol')).toContainText('Piotr')
})

test('pawn colours: auto-assigned, swapped in the picker, remembered next time', async ({ page }) => {
  const RED = '#d7263d'
  const BLUE = '#1f6fd1'

  await setUpGame(page, 'builtin:ttr', ['Anna', 'Bartek'])

  // Anna's roster red and Bartek's roster blue pick the matching pawns.
  const swatch = (name: string) => button(page, `Kolor pionka: ${name}`)

  await swatch('Anna').click()
  await dialog(page).getByRole('button', { name: 'Niebieski' }).click() // Bartek's: the two swap
  await button(page, 'Zacznij grę').click()
  await page.waitForURL(/#\/play\//)

  const s = await session(page, 'builtin:ttr')

  expect(s.seats.map((x) => [x.name, x.pawn])).toEqual([
    ['Anna', BLUE],
    ['Bartek', RED],
  ])

  // The board shows pawns, not roster colours.
  await expect(page.locator('main span[aria-hidden]', { hasText: /^A$/ }).first()).toHaveCSS('background-color', 'rgb(31, 111, 209)')

  await setUpGame(page, 'builtin:ttr')
  await swatch('Anna').click()
  await expect(dialog(page).getByRole('button', { name: 'Niebieski' })).toHaveAttribute('aria-pressed', 'true')
})

test('rounds: negative scores on the keypad, edit a past round', async ({ page }) => {
  await startGame(page, 'builtin:1000', ['Anna', 'Bartek'])

  await button(page, /^Runda \d/).click()
  await press(page, '120')
  await dialog(page).getByRole('button', { name: 'Bartek', exact: true }).click()
  await press(page, '-60')
  await dialog(page).getByRole('button', { name: /^Zapisz$/ }).last().click()

  // Edit round 1: Anna 120 → 100.
  await page.getByRole('button', { name: 'Edytuj rundę 1' }).click()

  const del = dialog(page).getByRole('button', { name: 'Usuń rundę' })

  await expect(del).toHaveCSS('color', 'rgb(236, 48, 72)') // arcade light --color-danger
  await button(page, 'Backspace').click()
  await button(page, 'Backspace').click()
  await press(page, '00')
  await dialog(page).getByRole('button', { name: /^Zapisz$/ }).first().click()

  const s = await session(page, 'builtin:1000')

  expect(s.rounds).toEqual([{ [seatId(s, 'Anna')]: 100, [seatId(s, 'Bartek')]: -60 }])
})

test('score sheet with multipliers: Szybka kawka counts tiles ×2', async ({ page }) => {
  await startGame(page, 'builtin:coffee-rush', ['Anna', 'Bartek'])

  await emptyCells(page).first().click()
  await press(page, '5')
  await dialog(page).locator('button.btn-cta').click() // ↓ next category
  await press(page, '3')
  await expect(dialog(page)).toContainText('= 6 punktów')
  await dialog(page).locator('button.btn-cta').click()
  await press(page, '2')
  await dialog(page).getByRole('button', { name: /Gotowe/ }).click()

  const s = await session(page, 'builtin:coffee-rush')

  expect(s.sheet.upgrades[seatId(s, 'Anna')]).toBe(3) // the count is stored, not the points
  await expect(page.locator('main')).toContainText('9') // 5 + 3×2 − 2
})

test('Rummikub: the round winner takes the others’ minus points', async ({ page }) => {
  await startGame(page, 'builtin:rummikub', ['Anna', 'Bartek', 'Cleo'])

  await button(page, /^Runda \d/).click()
  await dialog(page).getByRole('button', { name: /^Bartek/ }).first().click()
  await press(page, '-12')
  await dialog(page).getByRole('button', { name: /^Cleo/ }).first().click()
  await press(page, '-7')
  await dialog(page).getByRole('button', { name: /^Anna/ }).first().click()
  await dialog(page).getByRole('button', { name: /Zwycięzca rundy/ }).click()
  await dialog(page).getByRole('button', { name: /^Zapisz$/ }).last().click()

  const s = await session(page, 'builtin:rummikub')

  expect(s.rounds[0][seatId(s, 'Anna')]).toBe(19)
})

test('winner-only: Gorący ziemniak runs a hidden timer, fewest burns wins', async ({ page }) => {
  await page.clock.install()
  await startGame(page, 'builtin:hot-potato', ['Ola', 'Piotr'])

  const tile = (name: string) => page.locator('main').getByRole('button', { name: new RegExp(name) })

  /** One round: Start, let the potato go off (at most 30 s), tap who held it. */
  async function burn(name: string, n: number) {
    await button(page, `Start rundy ${n}`).click()
    await expect(button(page, 'Przerwij rundę')).toBeVisible()
    await expect(tile(name)).toBeDisabled()
    await page.clock.runFor(30_000)
    await expect(page.getByText('BUM!')).toBeVisible()
    await tile(name).click()
  }

  await burn('Piotr', 1)
  await expect(tile('Piotr')).toContainText('1 przegrana')
  await expect(button(page, 'Start rundy 2')).toBeVisible()

  await button(page, 'Cofnij').click()
  await expect(tile('Piotr')).toContainText('0 przegranych')

  await burn('Piotr', 1)
  await burn('Piotr', 2)
  await burn('Ola', 3)

  expect((await session(page, 'builtin:hot-potato')).rounds).toHaveLength(3)

  await finishGame(page)
  await expect(page.getByText('Zwycięzca')).toBeVisible()
  await expect(page.locator('main')).toContainText('Ola')
})

test('winner-only: stopping or skipping a Gorący ziemniak round records nothing', async ({ page }) => {
  await page.clock.install()
  await startGame(page, 'builtin:hot-potato', ['Ola', 'Piotr'])

  await button(page, 'Start rundy 1').click()
  await button(page, 'Przerwij rundę').click()
  await expect(button(page, 'Start rundy 1')).toBeVisible()

  await button(page, 'Start rundy 1').click()
  await page.clock.runFor(30_000)
  await button(page, 'Pomiń rundę').click()
  await expect(button(page, 'Start rundy 1')).toBeVisible()

  expect((await session(page, 'builtin:hot-potato')).rounds).toHaveLength(0)
})

test('a custom timed game gets neutral wording and its own icon, not the potato', async ({ page }) => {
  await page.clock.install()
  await page.goto('#/games/new')
  await page.getByPlaceholder('Nazwa gry').fill('Szybkie słowa')
  await button(page, '🧠').click()
  await page.getByText('Tylko zwycięzca').click()
  await page.getByText('Licznik czasu rundy').click()
  await button(page, 'Zapisz').click()

  await page.goto('#/new')
  await page.getByText('Szybkie słowa').first().click()
  await page.getByPlaceholder('Imię nowego gracza').fill('Ola')
  await page.keyboard.press('Enter')
  await button(page, 'Zacznij grę').click()

  const main = page.locator('main')

  await expect(main).toContainText('Naciśnij Start, gdy wszyscy będą gotowi')
  await expect(main).toContainText('🧠')
  await expect(main).not.toContainText('ziemniak')

  await button(page, 'Start rundy 1').click()
  await page.clock.runFor(30_000)
  await expect(page.getByText('Koniec czasu!')).toBeVisible()
  await expect(main).toContainText('Kto przegrał tę rundę?')
})

test('custom game from the editor, then played', async ({ page }) => {
  await page.goto('#/games/new')
  await page.getByPlaceholder('Nazwa gry').fill('Moja gra')
  await page.getByPlaceholder('Kategoria 1').fill('Skarby')
  await page.getByLabel('Punkty za sztukę').fill('3')
  await button(page, 'Zapisz').click()

  await page.goto('#/new')
  await page.getByText('Moja gra').first().click()
  await page.getByPlaceholder('Imię nowego gracza').fill('Anna')
  await page.keyboard.press('Enter')
  await button(page, 'Zacznij grę').click()

  await emptyCells(page).first().click()
  await press(page, '4')
  await expect(dialog(page)).toContainText('= 12 punktów')
})

test('switching to English translates the app', async ({ page }) => {
  await page.goto('#/more')
  await page.getByRole('radio', { name: /English/ }).click()
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()
  await page.goto('#/')
  await expect(button(page, 'New game')).toBeVisible()
})

test('players list still scrolls after deleting a player', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    const players = Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => {
        const id = `p${i}`

        return [id, { id, name: `Gracz ${String(i + 1).padStart(2, '0')}`, color: '#ef4444', updatedAt: 1 }]
      }),
    )

    localStorage.setItem('dice-digits:players', JSON.stringify(players))
  })
  await page.goto('#/players')
  await page.reload()

  // Deleting confirms in a second sheet over the editor; both close together.
  await page.getByText('Gracz 01').click()
  await dialog(page).getByRole('button', { name: 'Usuń' }).click()
  await dialog(page).last().getByRole('button', { name: 'Usuń' }).click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.getByText('Gracz 01')).toHaveCount(0)

  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await page.mouse.wheel(0, 2000)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})
