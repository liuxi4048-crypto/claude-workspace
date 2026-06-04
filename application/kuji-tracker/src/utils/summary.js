export function computeSummary(kujiDef, counts) {
  if (!kujiDef) return { totalGoods: 0, totalDraws: 0, acquired: 0, duplicates: 0, missing: 0, pct: 0 }
  const allGoods = kujiDef.prizes.flatMap(p => p.goods)
  const totalGoods = allGoods.length
  let totalDraws = 0, acquired = 0, duplicates = 0
  allGoods.forEach(g => {
    const c = counts[g.id] ?? 0
    totalDraws += c
    if (c >= 1) acquired++
    if (c >= 2) duplicates++
  })
  const missing = totalGoods - acquired
  const pct = totalGoods > 0 ? Math.round((acquired / totalGoods) * 100) : 0
  return { totalGoods, totalDraws, acquired, duplicates, missing, pct }
}
