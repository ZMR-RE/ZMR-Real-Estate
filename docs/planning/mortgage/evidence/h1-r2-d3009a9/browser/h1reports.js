// node h1reports.js <outDir> — H1 Reports browser checks: candidate (5213) scenarios + live baseline (5214)
const { chromium } = require('playwright'); const fs = require('fs')
const OUT = process.argv[2]; fs.mkdirSync(OUT)
const RUNS = [
  ['live', 'http://localhost:5214', 'before'],
  ['h1', 'http://localhost:5213', 'before'],
  ['h1', 'http://localhost:5213', 'after'],
  ['h1', 'http://localhost:5213', 'error'],
  ['h1', 'http://localhost:5213', 'hintonly'],
]
const tableText = (p) => p.$$eval('table tr', (rows) => rows.map((r) => [...r.children].map((c) => c.textContent.trim()).join(' | ')))
;(async () => {
  const b = await chromium.launch({ channel: 'chrome' }); const results = []
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    for (const [build, base, scenario] of RUNS) {
      if (build === 'live' && w !== 1440 && w !== 390) continue
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1 })
      const p = await ctx.newPage(); const errs = []
      p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
      await p.goto(`${base}/h1-reports-review.html?scenario=${scenario}`); await p.waitForTimeout(900)
      const r = { w, build, scenario }
      r.alert = (await p.locator('[role=alert]').allTextContents()).join(' / ')
      r.balanceSheet = await tableText(p)
      r.disclosure = (await p.locator('.field-hint').allTextContents()).join(' / ')
      const tag = `${w}-${build}-${scenario}`
      await p.mouse.move(0, 0)
      await p.screenshot({ path: `${OUT}/${tag}-1-balance-sheet.png`, fullPage: true })
      await p.getByRole('tab', { name: 'Cash flow' }).click(); await p.waitForTimeout(500)
      r.cashFlow = await tableText(p)
      r.memo = (await p.locator('.field-hint').allTextContents()).join(' / ')
      await p.mouse.move(0, 0)
      await p.screenshot({ path: `${OUT}/${tag}-2-cash-flow.png`, fullPage: true })
      r.scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth); r.overflow = r.scrollWidth > w
      r.errors = errs
      results.push(r); await ctx.close()
    }
  }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results.filter((r) => r.w === 1440), null, 1))
  for (const r of results.filter((x) => x.w !== 1440)) console.log(r.w, r.build, r.scenario, 'overflow', r.overflow, 'errors', r.errors.length, 'alert', r.alert)
  await b.close()
})()
