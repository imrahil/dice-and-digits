import { expect, test } from '@playwright/test'
import { button, dialog, press, startGame } from './helpers'

test('rounds: standings show the gap, the latest round is highlighted', async ({ page }) => {
  await startGame(page, 'builtin:1000', ['Anna', 'Bartek'])

  for (const [a, b] of [['120', '40'], ['60', '150']]) {
    await button(page, /^Runda \d/).click()
    await press(page, a)
    await dialog(page).getByRole('button', { name: 'Bartek', exact: true }).click()
    await press(page, b)
    await dialog(page).getByRole('button', { name: /^Zapisz$/ }).last().click()
  }

  await expect(button(page, 'Runda 3')).toBeVisible()
  await expect(page.getByText('prowadzi o 10')).toBeVisible() // Bartek 190, Anna 180
  await expect(page.getByText('−10 do lidera')).toBeVisible()
  await expect(page.locator('[aria-current="true"]')).toHaveAttribute('aria-label', 'Edytuj rundę 2')
})
