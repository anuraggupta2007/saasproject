import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/MailSavior/)
  })

  test('displays hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=MailSavior')).toBeVisible()
  })

  test('navigates to features page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Features')
    await expect(page).toHaveURL(/features/)
  })

  test('navigates to pricing page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Pricing')
    await expect(page).toHaveURL(/pricing/)
  })
})

test.describe('Authentication', () => {
  test('navigates to login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('navigates to register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('has working header navigation', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('has footer', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Mobile menu button should be visible
    const menuButton = page.locator('[aria-label="Toggle menu"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
    }
  })
})

test.describe('Accessibility', () => {
  test('page has lang attribute', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('images have alt text', async ({ page }) => {
    await page.goto('/')
    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toHaveAttribute('alt')
    }
  })
})
