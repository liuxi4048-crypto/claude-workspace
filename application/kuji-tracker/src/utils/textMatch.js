function normalize(str) {
  return str
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ')
    .toLowerCase()
    .trim()
}

function tokenize(text) {
  return normalize(text)
    .split(/[\s\r\n「」、。，．・]+/)
    .filter(t => t.length > 0)
}

function tokenizeLine(line) {
  return normalize(line)
    .split(/[\s「」、。，．・]+/)
    .filter(t => t.length > 0)
}

export function matchGoodsFromText(text, kujiDef) {
  if (!text || !kujiDef) return { matched: [], unmatched: [] }
  const allGoods = kujiDef.prizes.flatMap(p => p.goods)
  const normGoods = allGoods.map(g => ({
    id: g.id,
    name: g.name,
    normName: normalize(g.name),
    normSub: normalize(g.sub ?? '')
  }))

  const lines = text.split(/[\r\n]+/).filter(l => l.trim().length > 0)
  const matchMap = new Map()
  const unmatched = []

  for (const line of lines) {
    const tokens = tokenizeLine(line)
    if (tokens.length === 0) continue

    // Try to find goods where ALL tokens match
    const hits = normGoods.filter(g =>
      tokens.every(token =>
        g.normName.includes(token) || (g.normSub.length > 0 && g.normSub.includes(token))
      )
    )

    if (hits.length === 0) {
      // Fall back: try individual tokens
      const anyHits = new Set()
      for (const token of tokens) {
        const tokenHits = normGoods.filter(g =>
          g.normName.includes(token) || (g.normSub.length > 0 && g.normSub.includes(token))
        )
        tokenHits.forEach(g => anyHits.add(g))
      }
      if (anyHits.size === 0) {
        unmatched.push(...tokens)
      } else {
        for (const g of anyHits) {
          const entry = matchMap.get(g.id)
          if (entry) {
            entry.count++
          } else {
            matchMap.set(g.id, { goodsId: g.id, goodsName: g.name, count: 1 })
          }
        }
      }
    } else {
      for (const g of hits) {
        const entry = matchMap.get(g.id)
        if (entry) {
          entry.count++
        } else {
          matchMap.set(g.id, { goodsId: g.id, goodsName: g.name, count: 1 })
        }
      }
    }
  }

  return { matched: [...matchMap.values()], unmatched }
}
