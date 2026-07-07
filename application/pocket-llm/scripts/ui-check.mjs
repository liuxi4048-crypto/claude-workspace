// ビルド済みアプリのUIスモークテスト。
// /api/health と /api/chat をモックし、クラウド構成のフロントを検証する。
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-local')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }

const server = createServer((req, res) => {
  const path = req.url.split('?')[0]
  // --- API モック ---
  if (path === '/api/health') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, keyConfigured: true, model: 'gemini-mock' }))
    return
  }
  if (path === '/api/chat') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    // ストリーミングを模して分割送信
    res.write('これは')
    setTimeout(() => res.write('モック応答です。'), 30)
    setTimeout(() => res.end(), 60)
    return
  }
  // --- 静的ファイル ---
  let p = join(root, path.replace(/\/$/, '/index.html'))
  if (!existsSync(p)) p = join(root, 'index.html')
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4173)

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // iPhone 12 相当
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:4173/')
await page.waitForTimeout(800)

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

await check('WebGPU/モデルDL関連UIは撤去済み', async () => {
  for (const sel of ['#webgpu-warning', '#load-panel', '#model-select']) {
    if (await page.$(sel)) throw new Error(`${sel} が残存`)
  }
})

await check('バックエンド接続OKでバッジ表示', async () => {
  const badge = await page.$eval('#backend-badge', (el) => ({ hidden: el.hidden, text: el.textContent }))
  if (badge.hidden) throw new Error('バッジ非表示')
  if (!badge.text.includes('gemini-mock')) throw new Error(`badge=${badge.text}`)
})

await check('メインUIが最初から表示', async () => {
  const hidden = await page.$eval('#main-ui', (el) => el.hidden)
  if (hidden) throw new Error('main-ui が hidden')
})

await check('タブ切替(要約/計算/About/チャット)', async () => {
  for (const tab of ['summarize', 'calc', 'about', 'chat']) {
    await page.click(`.tab[data-tab="${tab}"]`)
    const active = await page.$eval(`#tab-${tab}`, (el) => el.classList.contains('active'))
    if (!active) throw new Error(`tab-${tab} not active`)
  }
})

await check('計算モード: 数式が電卓エンジンで即答(オフライン計算)', async () => {
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

await check('チャット: 送信→ストリーミング応答(モック)', async () => {
  await page.click('.tab[data-tab="chat"]')
  await page.fill('#chat-input', 'こんにちは')
  await page.click('#chat-send')
  await page.waitForTimeout(500)
  const bubbles = await page.$$eval('.bubble.assistant', (els) => els.map((e) => e.textContent))
  const last = bubbles[bubbles.length - 1] || ''
  if (!last.includes('モック応答')) throw new Error(`reply=${last}`)
})

await check('About タブにクラウド構成の説明', async () => {
  const txt = await page.textContent('#tab-about')
  for (const kw of ['得意なこと', '苦手なこと', 'クラウド']) {
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

await page.screenshot({ path: 'scripts/screenshot-chat.png' })

await browser.close()
server.close()
console.log(process.exitCode ? 'FAILED' : 'ALL CHECKS PASSED')
