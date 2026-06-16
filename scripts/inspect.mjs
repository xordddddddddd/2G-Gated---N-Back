import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const scene = document.querySelector('.grid3d-scene-rotate')
  const offset = document.querySelector('.grid3d-scene-offset')
  const viewport = document.querySelector('.grid3d-viewport')
  const frame = document.querySelector('.grid3d-frame')
  const get = (el) =>
    el
      ? {
          tag: el.tagName,
          transformStyle: getComputedStyle(el).transformStyle,
          transform: getComputedStyle(el).transform,
          perspective: getComputedStyle(el).perspective,
          overflow: getComputedStyle(el).overflow,
        }
      : null
  return {
    viewport: get(viewport),
    offset: get(offset),
    scene: get(scene),
    frame: get(frame),
    frameCount: document.querySelectorAll('.grid3d-frame').length,
    sceneHTML: scene?.innerHTML.slice(0, 200),
  }
})
console.log(JSON.stringify(info, null, 2))

await page.screenshot({ path: '/tmp/ours-playing.png' })
await page.click('button:has-text("Play")').catch(() => {})
await page.waitForTimeout(2000)
await page.screenshot({ path: '/tmp/ours-after-play.png' })

await browser.close()
