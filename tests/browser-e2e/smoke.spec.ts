
import { test, expect } from '@playwright/test';

test.describe('LXRT Browser Smoke Test', () => {

    test('should load the library and initialize', async ({ page }) => {
        // Go to the test page served by `npm run serve:browser`
        await page.goto('/');

        // Check title or presence of test UI
        await expect(page).toHaveTitle(/LXRT/);

        // Verify global exposure or module functionality
        // Assuming the test page exposes lxrt or runs a script
        // We can evaluate JS in context
        const isInitialized = await page.evaluate(async () => {
            // @ts-ignore
            if (!window.lxrt) return false;
            // @ts-ignore
            await window.lxrt.init(); // Should perform WASM load
            return true;
        });

        expect(isInitialized).toBe(true);
    });
});
