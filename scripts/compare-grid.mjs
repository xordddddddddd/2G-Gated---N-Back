import { chromium } from 'playwright'
import { createHash } from 'crypto'
import fs from 'fs'

async function gridShot(url, name) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  if (name === 'qb') await page.click('button:has-text("Close")').catch(() => {})
  await page.waitForTimeout(2000)
  const path = `/tmp/crop-${name}.png`
  await page.screenshot({ path, fullPage: false })
  const buf = fs.readFileSync(path)
  console.log(name, 'bytes', buf.length, 'md5', createHash('md5').update(buf).digest('hex'))
  await browser.close()
}

await gridShot('http://127.0.0.1:4173/', 'fixed')
await gridShot('https://quadbox.pages.dev/', 'qb')
