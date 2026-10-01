import { expect, test } from '@playwright/test'
import { button, startGame } from './helpers'

test('home: the game in progress is a resume card with live scores', async ({ page }) => {
  await startGame(page, 'builtin:catan', ['Anna', 'Bartek'])
  await page.locator('main button:has(svg.lucide-plus)').first().click()
  await page.goto('#/')

  const card = page.getByTestId('active-game')

  await expect(card).toContainText('Catan')
  await expect(card).toContainText('Anna')
  await expect(card).toContainText('1')
  await button(page, 'Wróć do gry').click()
  await page.waitForURL(/#\/play\//)
})

test('home: quick start is a grid of up to 8 games', async ({ page }) => {
  await page.goto('#/')
  await expect(page.locator('main .grid-cols-4 > button')).toHaveCount(8)
})
