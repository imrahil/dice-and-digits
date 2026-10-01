import { expect, test } from '@playwright/test'
import { button, dialog, emptyCells, finishGame, goLive, newPhone, press, seatId, session, startGame } from './helpers'

// Live games through the Room Durable Object: a scorekeeper (host) phone,
// players scoring their own seat from their phones, and a viewer.

test('join to score on a score sheet, including while the host is away', async ({ browser }) => {
  const host = await newPhone(browser)
  const guest = await newPhone(browser, { colorScheme: 'dark' })
  const viewer = await newPhone(browser)

  await startGame(host, 'builtin:7wonders', ['Anna', 'Bartek', 'Cleo'])

  const code = await goLive(host)

  await expect(host.locator('svg[role="img"]')).toBeVisible() // the QR code
  await host.keyboard.press('Escape')

  // The guest picks Bartek; for everyone else that seat is now taken.
  await guest.goto(`#/live/${code}`)
  await guest.getByRole('button', { name: /Bartek/ }).click()
  await expect(guest.getByText('Grasz jako Bartek')).toBeVisible()
  await viewer.goto(`#/live/${code}`)
  await expect(viewer.getByRole('button', { name: /Bartek/ })).toBeDisabled()

  // Only Bartek's column is editable on the guest's phone.
  await expect(emptyCells(guest)).toHaveCount(7)
  await emptyCells(guest).first().click()
  await press(guest, '5')
  await dialog(guest).locator('button.btn-cta').click()
  await press(guest, '12') // Treasury is coins ÷ 3 → 4 points
  await dialog(guest).getByRole('button', { name: /Gotowe/ }).click()

  await expect(async () => {
    const s = await session(host, 'builtin:7wonders')

    expect(s.sheet.military?.[seatId(s, 'Bartek')]).toBe(5)
    expect(s.sheet.coins?.[seatId(s, 'Bartek')]).toBe(12)
  }).toPass()

  // The viewer sees the host's entries live.
  await emptyCells(host).first().click()
  await press(host, '7')
  await dialog(host).getByRole('button', { name: /Gotowe/ }).click()
  await expect(viewer.locator('main')).toContainText('Anna')
  await expect(viewer.locator('main')).toContainText('9') // Bartek: 5 + 12÷3

  // The host leaves; the guest keeps scoring; it lands when the host is back.
  const playUrl = host.url()

  await host.goto('about:blank')
  await expect(guest.getByText(/Telefon prowadzącego jest offline/)).toBeVisible()
  await emptyCells(guest).first().click()
  await press(guest, '6')
  await dialog(guest).getByRole('button', { name: /Gotowe/ }).click()
  await expect(guest.getByText('Wysyłanie punktów…')).toBeVisible()

  await guest.reload()
  await expect(guest.getByText('Grasz jako Bartek')).toBeVisible() // seat kept

  await host.goto(playUrl)
  await expect(async () => {
    const s = await session(host, 'builtin:7wonders')

    expect(s.sheet.wonder?.[seatId(s, 'Bartek')]).toBe(6)
  }).toPass({ timeout: 20_000 })
  await expect(guest.getByText('Wysyłanie punktów…')).toBeHidden()

  // Finishing shows the final result everywhere.
  await finishGame(host)
  await expect(guest.getByText('Wynik końcowy')).toBeVisible()
  await expect(viewer.getByText('Wynik końcowy')).toBeVisible()
})

test('rounds merge: a player’s own entry and the host’s land in the same round', async ({ browser }) => {
  const host = await newPhone(browser)
  const guest = await newPhone(browser)

  await startGame(host, 'builtin:1000', ['Anna', 'Bartek', 'Cleo'])

  const code = await goLive(host)

  await host.keyboard.press('Escape')
  await guest.goto(`#/live/${code}`)
  await guest.getByRole('button', { name: /Cleo/ }).click()
  await button(guest, 'Dodaj mój wynik').click()
  await press(guest, '-40')
  await dialog(guest).getByRole('button', { name: /Zapisz/ }).click()

  // The host's "Add round" opens that round, already holding Cleo's −40.
  await expect(async () => {
    expect((await session(host, 'builtin:1000')).rounds).toHaveLength(1)
  }).toPass()
  await button(host, /Dodaj rundę/).click()
  await expect(dialog(host).getByText('-40')).toBeVisible()
  await press(host, '120')
  await dialog(host).getByRole('button', { name: 'Bartek', exact: true }).click()
  await press(host, '60')
  await dialog(host).getByRole('button', { name: /^Zapisz$/ }).first().click()

  const s = await session(host, 'builtin:1000')

  expect(s.rounds).toEqual([{ [seatId(s, 'Cleo')]: -40, [seatId(s, 'Anna')]: 120, [seatId(s, 'Bartek')]: 60 }])
})

test('counter: join by typed code, host frees the seat, host stops sharing', async ({ browser }) => {
  const host = await newPhone(browser)
  const guest = await newPhone(browser, { locale: 'en-GB' })

  await startGame(host, 'builtin:catan', ['Anna', 'Bartek'])

  const code = await goLive(host)

  await host.keyboard.press('Escape')

  await guest.goto('#/')
  await button(guest, 'Join a game').click()
  await guest.getByLabel('Game code').fill(code.toLowerCase())
  await button(guest, 'Join', true).click()
  await guest.getByRole('button', { name: /Anna/ }).click()

  const plus = guest.locator('main button:has(svg.lucide-plus)')

  await expect(plus).toHaveCount(1) // only Anna's buttons
  await plus.click()
  await plus.click()

  await expect(async () => {
    const s = await session(host, 'builtin:catan')

    expect(s.log.filter((e) => e.p === seatId(s, 'Anna')).reduce((a, e) => a + e.d, 0)).toBe(2)
  }).toPass()

  await host.getByRole('button', { name: /Na żywo/ }).click()
  await button(host, 'Zwolnij').click()
  await expect(guest.getByText('Join as a player')).toBeVisible()

  await button(host, 'Zatrzymaj udostępnianie').click()
  await expect(guest.getByText(/stopped sharing/)).toBeVisible()
})
