import { expect, test } from '@playwright/test'
import { button, dialog, finishGame, press, startGame } from './helpers'

test('result: winner card shows the margin, breakdown expands', async ({ page }) => {
  await startGame(page, 'builtin:1000', ['Anna', 'Bartek'])
  await button(page, /Dodaj rundę|Runda/).click()
  await press(page, '120')
  await dialog(page).getByRole('button', { name: 'Bartek', exact: true }).click()
  await press(page, '60')
  await dialog(page).getByRole('button', { name: /^Zapisz$/ }).last().click()
  await finishGame(page)
  await expect(page.getByText('Zwycięzca')).toBeVisible()
  await expect(page.getByText('60 punktów przewagi')).toBeVisible()
  await expect(page.getByText('−60 do zwycięzcy')).toBeVisible()
  await page.getByText('1 runda').click()
  await expect(page.getByRole('button', { name: 'Edytuj rundę 1' })).toHaveCount(0) // read-only table
})
