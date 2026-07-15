import { test, expect } from '@playwright/test'

test.describe('Public Pages', () => {
  const pages = [
    { path: '/', title: /MailSavior/ },
    { path: '/features', title: /Features/ },
    { path: '/pricing', title: /Pricing/ },
    { path: '/about', title: /About/ },
    { path: '/contact', title: /Contact/ },
    { path: '/faq', title: /FAQ/ },
    { path: '/privacy', title: /Privacy/ },
    { path: '/terms', title: /Terms/ },
  ]

  for (const { path, title } of pages) {
    test(`page ${path} loads and has title`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveTitle(title)
    })
  }
})

test.describe('Auth Pages', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('Error Pages', () => {
  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
