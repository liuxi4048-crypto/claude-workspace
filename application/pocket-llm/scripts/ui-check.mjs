// ビルド済みアプリのUIスモークテスト(コンテナにGPUが無いため WebGPU 警告経路を検証)
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-local')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }

const server = createServer((req, res) => {
  let p = join(root, req.url.split('?')[0].replace(/\/$/, '/index.html'))
  if (!existsSync(p)) p = join(root, 'index.html')
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4173)

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // iPhone 12 相当のモバイル画面
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:4173/')
await page.waitForTimeout(1500)

const check = async (name, fn) => {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    process.exitCode = 1
  }
}

await check('タイトル表示', async () => {
  const t = await page.title()
  if (!t.includes('Pocket LLM')) throw new Error(`title=${t}`)
})

await check('ヘッダー表示', async () => {
  const h = await page.textContent('.app-header h1')
  if (!h.includes('Pocket LLM')) throw new Error(h)
})

await check('WebGPU 判定(コンテナではGPU無し想定)', async () => {
  const hasGpu = await page.evaluate(async () => {
    if (!('gpu' in navigator)) return false
    try { return (await navigator.gpu.requestAdapter()) !== null } catch { return false }
  })
  const warnHidden = await page.$eval('#webgpu-warning', (el) => el.hidden)
  console.log(`   (WebGPU available: ${hasGpu}, warning hidden: ${warnHidden})`)
  // GPUあり→警告は隠れる(hidden=true)、GPUなし→警告表示(hidden=false)
  if (hasGpu !== warnHidden) throw new Error('WebGPU 有無と警告表示が不整合')
})

await check('モデル選択肢が5件', async () => {
  const n = await page.$$eval('#model-select option', (o) => o.length)
  if (n !== 5) throw new Error(`options=${n}`)
})

await check('既定モデルは Qwen2.5 7B(q4f32)', async () => {
  const v = await page.$eval('#model-select', (el) => el.value)
  if (v !== 'Qwen2.5-7B-Instruct-q4f32_1-MLC') throw new Error(v)
})

await check('全モデルが q4f32(モバイル安定版)', async () => {
  const vals = await page.$$eval('#model-select option', (o) => o.map((x) => x.value))
  const bad = vals.filter((v) => !v.includes('q4f32'))
  if (bad.length) throw new Error(`非f32モデル: ${bad.join(', ')}`)
})

// タブUI はモデルロード後に表示されるため、検証用に強制表示して切替を確認
await check('タブ切替(要約/計算/About)', async () => {
  await page.evaluate(() => { document.getElementById('main-ui').hidden = false })
  for (const tab of ['summarize', 'calc', 'about', 'chat']) {
    await page.click(`.tab[data-tab="${tab}"]`)
    const active = await page.$eval(`#tab-${tab}`, (el) => el.classList.contains('active'))
    if (!active) throw new Error(`tab-${tab} not active`)
  }
})

await check('計算モード: 数式が電卓エンジンで即答', async () => {
  await page.click('.tab[data-tab="calc"]')
  await page.fill('#calc-input', '(1200*3 + 480) / 2')
  await page.click('#calc-form button[type=submit]')
  await page.waitForTimeout(300)
  const out = await page.textContent('#calc-output')
  if (!out.includes('2,040')) throw new Error(`output=${out}`)
})

await check('計算モード: 数式エラー処理', async () => {
  await page.fill('#calc-input', '1/0')
  await page.click('#calc-form button[type=submit]')
  await page.waitForTimeout(300)
  const out = await page.textContent('#calc-output')
  if (!out.includes('0 で割る')) throw new Error(`output=${out}`)
})

await check('About タブに得意/苦手の説明', async () => {
  const txt = await page.textContent('#tab-about')
  for (const kw of ['得意なこと', '苦手なこと', '完全プライベート', 'オフライン']) {
    if (!txt.includes(kw)) throw new Error(`missing: ${kw}`)
  }
})

await check('manifest.json 取得可能', async () => {
  const res = await page.evaluate(() => fetch('manifest.json').then((r) => r.ok))
  if (!res) throw new Error('manifest fetch failed')
})

await check('JSエラーなし', async () => {
  if (errors.length) throw new Error(errors.join(' / '))
})

await page.screenshot({ path: 'scripts/screenshot-load.png' })
await page.click('.tab[data-tab="calc"]')
await page.screenshot({ path: 'scripts/screenshot-calc.png' })

await browser.close()
server.close()
console.log(process.exitCode ? 'FAILED' : 'ALL CHECKS PASSED')
