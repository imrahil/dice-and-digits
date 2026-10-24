import { expect, test } from '@playwright/test'
import { button } from './helpers'

test('help: reached from the empty home screen and from More; topics open and link on', async ({ page }) => {
  await page.goto('#/')
  await button(page, 'Pierwszy raz? Zobacz, jak to działa').click()
  await page.waitForURL(/#\/help/)

  const topic = page.locator('details', { hasText: 'Moje gry i losowanie gry na dziś' })

  await expect(topic.getByText(/Stuknij serduszko/)).toBeHidden()
  await topic.locator('summary').click()
  await expect(topic.getByText(/Stuknij serduszko/)).toBeVisible()
  await topic.getByRole('button', { name: 'Moje gry' }).click()
  await page.waitForURL(/#\/my-games/)

  await page.goto('#/more')
  await button(page, 'Jak to działa').click()
  await page.waitForURL(/#\/help/)
  await expect(page.locator('details')).toHaveCount(11)
})
