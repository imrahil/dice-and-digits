import { expect, test } from '@playwright/test'
import { button, finishGame, newPhone, startGame } from './helpers'

// Two phones, one shared group, through the real worker on wrangler dev.

test('a finished game reaches the other phone through a shared group', async ({ browser }) => {
  const a = await newPhone(browser)
  const b = await newPhone(browser)

  await startGame(a, 'builtin:splendor', ['Ola', 'Piotr'])
  await button(a, '+3').first().click()
  await finishGame(a)

  await a.goto('#/more')
  await a.getByPlaceholder('np. Piątkowa ekipa').fill('Piątkowa ekipa')
  await button(a, 'Utwórz grupę').click()
  await expect(a.getByText(/Ostatnia synchronizacja/)).toBeVisible()

  // The invite: QR sheet on A, its link opened on B.
  await button(a, 'Zaproś').click()
  await expect(a.getByText('Zeskanuj, by dołączyć do grupy')).toBeVisible()

  const invite = await a.getByRole('dialog').locator('p.select-all').innerText()

  await b.goto(invite.slice(invite.indexOf('#')))
  await expect(b.getByText(/Dołączyć do „Piątkowa ekipa”/)).toBeVisible()
  await button(b, 'Dołącz do grupy').click()
  await b.waitForURL(/#\/more/)

  await b.goto('#/history')
  await expect(b.locator('main')).toContainText('Splendor')
  await expect(b.locator('main')).toContainText('Wygrywa Ola')

  // And back: a game B finishes shows up on A.
  await startGame(b, 'builtin:catan')
  await button(b, '+2').first().click()
  await finishGame(b)
  await expect(async () => {
    await a.goto('#/history')
    await a.evaluate(() => window.dispatchEvent(new Event('online'))) // nudge a sync
    await expect(a.locator('main')).toContainText('Catan', { timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
})

test('joining another group warns that this phone leaves its current one', async ({ browser }) => {
  const a = await newPhone(browser)
  const b = await newPhone(browser)

  for (const [phone, name] of [
    [a, 'Rodzina'],
    [b, 'Praca'],
  ] as const) {
    await phone.goto('#/more')
    await phone.getByPlaceholder('np. Piątkowa ekipa').fill(name)
    await button(phone, 'Utwórz grupę').click()
    await expect(phone.getByText(/Ostatnia synchronizacja|Jeszcze nie/)).toBeVisible()
  }

  await button(a, 'Zaproś').click()

  const invite = await a.getByRole('dialog').locator('p.select-all').innerText()

  await b.goto(invite.slice(invite.indexOf('#')))
  await expect(b.getByRole('alert')).toContainText('Ten telefon należy do „Praca”')
  await expect(button(b, 'Zmień grupę')).toBeVisible()
  await button(b, 'Anuluj').click()
  await b.goto('#/more')
  await expect(b.locator('main')).toContainText('Praca')
})
