import { expect, test } from '@playwright/test'
import { button, finishGame, newPhone, startGame } from './helpers'

// Two phones, one shared group, through the real worker on wrangler dev.

test('a finished game reaches the other phone through a shared group', async ({ browser }) => {
  const a = await newPhone(browser)
  const b = await newPhone(browser)

  await startGame(a, 'builtin:splendor', ['Ola', 'Piotr'])
  await button(a, '+3').first().click()
  await finishGame(a)

  // Groups live under More → Advanced.
  await a.goto('#/more')
  await expect(a.getByPlaceholder('np. Piątkowa ekipa')).toHaveCount(0)
  await button(a, 'Zaawansowane').click()
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
  await b.waitForURL(/#\/advanced/)

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
    await phone.goto('#/advanced')
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

test('personal backup: six words on one phone restore everything on another', async ({ browser }) => {
  const a = await newPhone(browser)
  const b = await newPhone(browser)

  await startGame(a, 'builtin:splendor', ['Ola', 'Piotr'])
  await button(a, '+3').first().click()
  await finishGame(a)

  // The backup sits under More → Advanced, and More flags the unsaved words.
  await a.goto('#/advanced')
  await button(a, 'Utwórz kopię').click()

  // The recovery words open straight away; until they're confirmed, More nags.
  const words = (await a.getByTestId('recovery-words').getAttribute('data-words'))!

  expect(words.split(' ')).toHaveLength(6)
  await a.keyboard.press('Escape')
  await a.goto('#/more')
  await expect(a.getByLabel(/Zapisz słowa odzyskiwania/)).toBeVisible()
  await button(a, 'Zaawansowane').click()
  await button(a, 'Kod odzyskiwania').click()
  await button(a, 'Kod zapisany').click()
  const section = (title: string) => a.locator('section', { has: a.getByRole('heading', { name: title }) })

  await expect(section('Kopia w chmurze')).toContainText('Moja kopia')
  await expect(section('Kopia w chmurze').getByText(/Ostatnia synchronizacja/)).toBeVisible()
  await expect(a.getByText(/Zapisz kod odzyskiwania/)).toHaveCount(0)
  await expect(section('Wspólna grupa')).toContainText('najpierw wyłącz kopię')
  await a.goto('#/more')
  await expect(a.getByLabel(/Zapisz słowa odzyskiwania/)).toHaveCount(0)

  // A fresh phone: More → Advanced → Restore from code.
  await b.goto('#/advanced')
  await button(b, 'Przywróć z kodu').click()
  const field = b.getByLabel('Słowa lub link odzyskiwania')

  // A typo names the word; then typed as a child might, in capitals and without Polish letters.
  await field.fill(`${words.split(' ').slice(0, 5).join(' ')} xyzzy`)
  await button(b, 'Przywróć').click()
  await expect(b.getByRole('alert')).toContainText('„xyzzy” to nie jest słowo z kodu')
  await field.fill(words.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').toUpperCase())
  await button(b, 'Przywróć').click()
  await expect(b.getByText(/Przywrócić „Moja kopia”/)).toBeVisible()
  await button(b, 'Przywróć').click()
  await b.waitForURL(/#\/advanced/)

  await b.goto('#/history')
  await expect(b.locator('main')).toContainText('Splendor')
  await expect(b.locator('main')).toContainText('Wygrywa Ola')
})
