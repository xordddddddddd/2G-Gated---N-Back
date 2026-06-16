import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const offset = document.querySelector('.grid3d-scene-offset')
  const scene = document.querySelector('.grid3d-scene-rotate')
  const frame = document.querySelector('.grid3d-frame')
  const cs = (el) => getComputedStyle(el)
  return {
    offset: {
      transform: cs(offset).transform,
      translate: cs(offset).translate,
      transformStyle: cs(offset).transformStyle,
    },
    scene: {
      transform: cs(scene).transform,
      translate: cs(scene).translate,
      rotate: cs(scene).rotate,
      transformStyle: cs(scene).transformStyle,
    },
    frame: {
      transform: cs(frame).transform,
      translate: cs(frame).translate,
      transformStyle: cs(frame).transformStyle,
    },
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
