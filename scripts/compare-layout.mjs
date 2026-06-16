import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

for (const [name, url] of [
  ['ours', 'https://xordddddddddd.github.io/2G-Gated---N-Back/'],
  ['qb', 'https://quadbox.pages.dev/'],
]) {
  await page.goto(url, { waitUntil: 'networkidle' })
  if (name === 'qb') await page.click('button:has-text("Close")').catch(() => {})
  await page.waitForTimeout(2000)

  const info = await page.evaluate(() => {
    const viewport = document.querySelector('.grid3d-viewport')
    const scene = document.querySelector('.grid3d-scene')
    const qbPerspective = document.querySelector('[class*="perspective-"]')
    const qbScene = document.querySelector('.scene')

    const measure = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        perspective: cs.perspective,
        transformStyle: cs.transformStyle,
        overflow: cs.overflow,
      }
    }

    return {
      viewport: measure(viewport),
      scene: measure(scene),
      qbPerspective: measure(qbPerspective),
      qbScene: measure(qbScene),
      boardParent: (() => {
        const el = viewport?.parentElement
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height), cls: el.className }
      })(),
    }
  })

  await page.screenshot({ path: `/tmp/compare-${name}.png` })
  console.log(`\n=== ${name} ===`)
  console.log(JSON.stringify(info, null, 2))
}

await browser.close()
