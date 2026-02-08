const { test, expect } = require('@playwright/test');

test('homepage has title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Your App Title/);
});

test('homepage has a specific element', async ({ page }) => {
    await page.goto('http://localhost:3000');
    const element = await page.locator('selector-for-element');
    await expect(element).toBeVisible();
});