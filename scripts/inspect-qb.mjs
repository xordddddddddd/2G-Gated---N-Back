import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('https://quadbox.pages.dev/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Close")').catch(() => {})
await page.waitForTimeout(2500)

const info = await page.evaluate(() => {
  const scene = document.querySelector('.scene')
  const parent = scene?.parentElement
  const frame = document.querySelector('.scene img')
  const get = (el) =>
    el
      ? {
          className: el.className,
          transformStyle: getComputedStyle(el).transformStyle,
          transform: getComputedStyle(el).transform,
          width: getComputedStyle(el).width,
          height: getComputedStyle(el).height,
          perspective: getComputedStyle(el).perspective,
        }
      : null
  return {
    parent: get(parent),
    scene: get(scene),
    frame: get(frame),
    frameCount: document.querySelectorAll('.scene img').length,
    frames: [...document.querySelectorAll('.scene img')].slice(0, 3).map((img) => ({
      className: img.className,
      transform: getComputedStyle(img).transform,
    })),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '/tmp/quadbox-clean.png' })
await browser.close()
