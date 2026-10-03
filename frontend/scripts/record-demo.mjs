// Records the demo walkthrough (DEMO.md) as a video, as a fallback for the live demo.
// Usage: npm run demo:record   ->   demo-recording/ninefive-demo.webm
// Runs its own dev server on the mock API, so nothing else needs to be running.
import { mkdir, rename, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}demo-recording`
const size = { width: 1440, height: 900 }

// A visible cursor and a caption bar; video recordings show neither by default.
const overlay = () => {
  const add = () => {
    if (document.getElementById('demo-cursor')) return
    const cursor = document.createElement('div')
    cursor.id = 'demo-cursor'
    cursor.style.cssText =
      'position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
      'background:rgba(148,189,61,.85);box-shadow:0 0 0 3px rgba(255,255,255,.9);pointer-events:none;' +
      'transition:transform .1s;left:-50px;top:-50px'
    const caption = document.createElement('div')
    caption.id = 'demo-caption'
    caption.style.cssText =
      'position:fixed;z-index:99998;left:50%;bottom:28px;transform:translateX(-50%);max-width:880px;' +
      'padding:12px 22px;border-radius:14px;background:rgba(11,51,25,.92);color:#fff;' +
      "font:600 17px/1.4 'Manrope Variable',system-ui,sans-serif;text-align:center;pointer-events:none;" +
      'box-shadow:0 12px 32px -12px rgba(0,0,0,.5);opacity:0;transition:opacity .3s'
    document.body.append(cursor, caption)
    addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`
      cursor.style.top = `${e.clientY}px`
    })
    addEventListener('mousedown', () => (cursor.style.transform = 'scale(.7)'))
    addEventListener('mouseup', () => (cursor.style.transform = 'scale(1)'))
    window.__caption = (text) => {
      caption.textContent = text
      caption.style.opacity = text ? '1' : '0'
    }
  }
  if (document.body) add()
  else addEventListener('DOMContentLoaded', add)
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5199 } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: size,
  colorScheme: 'light',
  recordVideo: { dir: outDir, size },
})
await context.addInitScript(overlay)
const page = await context.newPage()

const pause = (ms) => page.waitForTimeout(ms)
const caption = (text) => page.evaluate((t) => window.__caption?.(t), text)
async function moveTo(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 })
}
async function click(locator, wait = 900) {
  await moveTo(locator)
  await pause(250)
  await locator.click()
  await pause(wait)
}
async function scrollBy(y) {
  await page.mouse.wheel(0, y)
  await pause(1300)
}

try {
  await page.goto(`${base}/board?view=board`)
  await page.getByRole('region', { name: 'Nou' }).waitFor()
  await pause(800)

  await caption('Licitațiile potrivite profilului vostru, pe etape, actualizate la fiecare 30 de minute')
  await pause(3500)
  await click(page.getByRole('button', { name: 'Derulează la dreapta' }), 1200)
  await click(page.getByRole('button', { name: 'Derulează la stânga' }), 1200)

  await caption('Căutarea găsește și licitațiile scrise în rusă')
  await click(page.getByRole('searchbox'), 300)
  await page.keyboard.type('calculatoare', { delay: 90 })
  await pause(2800)
  await click(page.getByRole('button', { name: 'Șterge căutarea' }), 900)

  await caption('Filtre: de exemplu, doar licitațiile la care sunteți eligibili 100%')
  const filters = page.getByRole('group', { name: 'Filtre' })
  await click(filters.getByRole('button', { name: 'Eligibilitate', exact: true }), 700)
  await click(page.locator('[data-slot=popover-content]').getByRole('button', { name: /^100/ }), 2600)
  await click(page.getByRole('button', { name: 'Resetează filtrele' }), 1200)

  await caption('Zona gri: AI nu e sigur că aveți produsul cerut. Decideți dintr-un clic.')
  const grayZone = page.getByRole('article').filter({ hasText: 'multifuncționale color A3' })
  await moveTo(grayZone)
  await pause(2500)
  await click(grayZone.getByRole('button', { name: 'Avem', exact: true }), 2200)

  await caption('Fiecare licitație: eligibilitate, șanse și produse potrivite, totul cu sursă și pagină')
  await click(page.getByRole('link', { name: /aparatul administrativ/ }).first(), 2500)
  await scrollBy(500)
  await scrollBy(600)
  await scrollBy(700)

  await caption('Semnale de integritate: tipare din date, cu dovezi. Nu acuzații.')
  await page.mouse.wheel(0, -3000)
  await pause(600)
  await click(page.getByRole('link', { name: 'Semnale de integritate' }), 2500)
  await scrollBy(500)
  await pause(1200)

  await caption('Analiza concurenților: de ce a fost respinsă oferta și ce să faceți diferit')
  await page.mouse.wheel(0, -3000)
  await click(page.getByRole('link', { name: 'Licitații' }).first(), 1500)
  await click(page.getByRole('link', { name: /tablelor interactive/ }).first(), 1800)
  await click(page.getByRole('link', { name: 'Concurenți' }), 2500)
  await scrollBy(600)
  await scrollBy(700)
  await scrollBy(700)

  await caption('Temă întunecată, interfață în română, engleză și rusă')
  await page.mouse.wheel(0, -4000)
  await pause(600)
  await click(page.getByRole('button', { name: 'Comută la tema întunecată' }), 1800)
  await click(page.getByRole('button', { name: 'RU' }), 2400)
  await click(page.getByRole('button', { name: 'RO' }), 1200)

  await caption('Profilul: date din data2b.md după IDNO, catalog din listele de prețuri')
  await click(page.getByRole('link', { name: 'Profilul companiei' }).first(), 2500)
  await scrollBy(700)
  await scrollBy(800)
  await pause(1000)
  await caption('')
  await pause(800)
} finally {
  const video = page.video()
  await context.close()
  if (video) await rename(await video.path(), `${outDir}/ninefive-demo.webm`)
  await browser.close()
  await server.close()
}
console.log(`Saved ${outDir}/ninefive-demo.webm`)
