import { chromium } from 'playwright'

const url = process.argv[2] || 'http://127.0.0.1:4173/'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const scene = document.querySelector('.grid3d-scene')
  const frames = [...document.querySelectorAll('.grid3d-frame')]
  const get = (el) => {
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      className: el.className,
      transformStyle: cs.transformStyle,
      transform: cs.transform,
      translate: cs.translate,
      rotate: cs.rotate,
      width: cs.width,
      height: cs.height,
      position: cs.position,
    }
  }
  return {
    scene: get(scene),
    frameCount: frames.length,
    frames: frames.slice(0, 4).map(get),
    supportsTranslate: CSS.supports('translate', '0 0 1px'),
  }
})

console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '/tmp/grid-debug.png', fullPage: false })
console.log('screenshot: /tmp/grid-debug.png')
await browser.close()
