import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

// Quadbox playing
await page.goto('https://quadbox.pages.dev/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Close")').catch(() => {})
await page.click('button:has-text("Play")').catch(() => {})
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/qb-play.png' })

const qb = await page.evaluate(() => {
  const cell = document.querySelector('.cell')
  const face = cell?.querySelector('.face')
  const cs = (el) => (el ? getComputedStyle(el) : null)
  return {
    cell: cell
      ? {
          className: cell.className,
          transform: cs(cell).transform,
          translate: cs(cell).translate,
        }
      : null,
    face: face
      ? {
          transform: cs(face).transform,
          translate: cs(face).translate,
          rotate: cs(face).rotate,
        }
      : null,
  }
})
console.log('quadbox', JSON.stringify(qb, null, 2))

// Ours playing
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.click('button:has-text("Play")')
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/ours-play2.png' })

const ours = await page.evaluate(() => {
  const cell = document.querySelector('.grid3d-cell')
  const face = cell?.querySelector('.grid3d-face-front')
  const cs = (el) => (el ? getComputedStyle(el) : null)
  return {
    cell: cell
      ? {
          className: cell.className,
          transform: cs(cell).transform,
          translate: cs(cell).translate,
        }
      : null,
    face: face
      ? {
          transform: cs(face).transform,
          translate: cs(face).translate,
          rotate: cs(face).rotate,
        }
      : null,
  }
})
console.log('ours', JSON.stringify(ours, null, 2))

await browser.close()
