import { expect, test } from '@playwright/test'
import { button, dialog, session, startGame } from './helpers'

test('counter: switch to grid from the menu, remembered after reload', async ({ page }) => {
  await startGame(page, 'builtin:catan', ['Anna', 'Bartek', 'Cleo', 'Daria'])
  await button(page, 'Menu').click()
  await dialog(page).getByRole('radio', { name: /Siatka/ }).click()
  await expect(dialog(page)).toBeHidden()
  await page.locator('main button:has(svg.lucide-plus)').first().click()
  await page.reload()
  expect((await session(page, 'builtin:catan')).counterView).toBe('grid')
  await expect(page.getByText('brakuje 9')).toBeVisible() // Catan target 10, Anna has 1
})

test('counter: table mode hides the header, undo and back to list work', async ({ page }) => {
  await startGame(page, 'builtin:catan', ['Anna', 'Bartek'])
  await button(page, 'Menu').click()
  await dialog(page).getByRole('radio', { name: /Stół/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
  await page.locator('button:has(svg.lucide-plus)').last().click()
  await button(page, 'Cofnij').click()
  expect((await session(page, 'builtin:catan')).log).toHaveLength(0)
  await button(page, /Lista/).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('counter: table option is disabled for a solo game', async ({ page }) => {
  await startGame(page, 'builtin:counter', ['Anna'])
  await button(page, 'Menu').click()
  await expect(dialog(page).getByRole('radio', { name: /Stół/ })).toBeDisabled()
})
