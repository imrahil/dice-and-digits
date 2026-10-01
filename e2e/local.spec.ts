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

test('rounds: negative scores on the keypad, edit a past round', async ({ page }) => {
  await startGame(page, 'builtin:1000', ['Anna', 'Bartek'])

  await button(page, /Dodaj rundę/).click()
  await press(page, '120')
  await dialog(page).getByRole('button', { name: 'Bartek', exact: true }).click()
  await press(page, '-60')
  await dialog(page).getByRole('button', { name: /^Zapisz$/ }).last().click()

  // Edit round 1: Anna 120 → 100.
  await page.getByRole('button', { name: 'Edytuj rundę 1' }).click()
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

  await button(page, /Dodaj rundę/).click()
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

test('winner-only: Gorący ziemniak counts who lost, fewest losses wins', async ({ page }) => {
  await startGame(page, 'builtin:hot-potato', ['Ola', 'Piotr'])
  await expect(page.getByText('Kto przegrał tę rundę?')).toBeVisible()

  await page.getByRole('button', { name: /Piotr/ }).click()
  await page.getByRole('button', { name: /Piotr/ }).click()
  await page.getByRole('button', { name: /Ola/ }).click()
  await button(page, 'Cofnij').click()

  expect((await session(page, 'builtin:hot-potato')).rounds).toHaveLength(2)

  await finishGame(page)
  await expect(page.getByText('Zwycięzca')).toBeVisible()
  await expect(page.locator('main')).toContainText('Ola')
  await expect(page.getByText('Zwycięzca')).toBeVisible()
})

test('custom game from the editor, then played', async ({ page }) => {
  await page.goto('#/games/new')
  await page.getByPlaceholder('Nazwa gry').fill('Moja gra')
  await page.getByPlaceholder('Kategoria 1').fill('Skarby')
  await page.getByLabel('Punkty za sztukę').fill('3')
  await button(page, 'Zapisz').click()

  await page.goto('#/new')
  await page.getByText('Moja gra').click()
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
