// icon.svg から PWA 用 PNG アイコンを生成する(開発時のみ使用)
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/icon.svg'), 'utf8')

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
})
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>*{margin:0}</style><div style="width:${size}px;height:${size}px">${svg.replace(
      '<svg ',
      `<svg width="${size}" height="${size}" `
    )}</div>`
  )
  const buf = await page.screenshot({ omitBackground: true })
  writeFileSync(join(root, `public/icon-${size}.png`), buf)
  console.log(`generated icon-${size}.png (${buf.length} bytes)`)
  await page.close()
}
await browser.close()
