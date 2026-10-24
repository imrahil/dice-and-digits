import { expect, test } from '@playwright/test'
import { button, dialog } from './helpers'

test('my games: heart games, create one, then draw tonight’s game', async ({ page }) => {
  await page.goto('#/my-games')
  await expect(page.getByText('Brak ulubionych gier')).toBeVisible()

  // Heart two built-ins from the add sheet.
  await button(page, 'Dodaj gry').click()
  await dialog(page).getByRole('searchbox').fill('catan')
  await dialog(page).getByRole('button', { name: /Catan/ }).first().click()
  await dialog(page).getByRole('searchbox').fill('splendor')
  await dialog(page).getByRole('button', { name: /Splendor/ }).click()
  await button(page, 'Gotowe').click()
  await expect(page.locator('main')).toContainText('Catan')
  await expect(page.locator('main')).toContainText('Splendor')

  // A game you create goes straight into My games.
  await button(page, 'Nowa gra').click()
  await page.getByPlaceholder('Nazwa gry').fill('Nasza gra')
  await page.getByRole('radio', { name: 'Licznik' }).click()
  await button(page, 'Zapisz').click()
  await page.waitForURL(/#\/my-games/)
  await expect(page.locator('main')).toContainText('Nasza gra')
  await expect(page.getByText('3 gry')).toBeVisible()

  // The draw lands on one of them and opens its setup.
  await button(page, 'Losuj grę').click()
  await expect(dialog(page).getByRole('button', { name: 'Gramy' })).toBeEnabled({ timeout: 5_000 })

  const picked = await page.getByTestId('drawn-game').innerText()

  expect(['Catan', 'Splendor', 'Nasza gra']).toContain(picked)
  await dialog(page).getByRole('button', { name: 'Gramy' }).click()
  await page.waitForURL(/#\/new\//)
  await expect(page.locator('main')).toContainText(picked)

  // Unhearting from the setup card takes it off the list.
  await button(page, 'Usuń z Moich gier').click()
  await page.goto('#/my-games')
  await expect(page.getByText('2 gry')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(picked)

  // Home offers the draw once there are two games to pick from.
  await page.goto('#/')
  await expect(button(page, 'Losuj grę z Moich gier')).toBeVisible()
})
