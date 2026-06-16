import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('https://quadbox.pages.dev/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Close")').catch(() => {})
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const scene = document.querySelector('.scene')
  const frame = document.querySelector('.scene img')
  const cs = (el) => getComputedStyle(el)
  return {
    scene: {
      transform: cs(scene).transform,
      translate: cs(scene).translate,
      rotate: cs(scene).rotate,
      transformStyle: cs(scene).transformStyle,
    },
    frame: {
      transform: cs(frame).transform,
      translate: cs(frame).translate,
      rotate: cs(frame).rotate,
      transformStyle: cs(frame).transformStyle,
    },
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
