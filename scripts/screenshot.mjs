import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/ours.png' })

await page.goto('https://quadbox.pages.dev/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/quadbox.png' })

await browser.close()
console.log('screenshots saved')
