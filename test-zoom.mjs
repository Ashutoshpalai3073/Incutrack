import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:5173');

// Wait for dust animation to settle
await page.waitForTimeout(4000);
await page.screenshot({ path: 'zoom-1-hero-before.png' });
console.log('Screenshot 1: hero (before scroll)');

// Trigger zoom-in scroll
await page.mouse.wheel(0, 300);
await page.waitForTimeout(250);
await page.screenshot({ path: 'zoom-2-mid-pull.png' });
console.log('Screenshot 2: mid-pull (~250ms in)');

await page.waitForTimeout(300);
await page.screenshot({ path: 'zoom-3-peak.png' });
console.log('Screenshot 3: peak scale');

await page.waitForTimeout(700);
await page.screenshot({ path: 'zoom-4-section-appeared.png' });
console.log('Screenshot 4: after transition, section visible');

// Scroll back to test reverse path
await page.mouse.wheel(0, -300);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'zoom-5-back-to-hero.png' });
console.log('Screenshot 5: back to hero after reverse scroll');

await browser.close();
console.log('\nAll screenshots saved.');
