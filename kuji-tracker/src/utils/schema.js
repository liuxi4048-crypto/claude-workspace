export function validateKujiDef(obj) {
  const errors = []
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Not an object'] }
  if (!obj.id || typeof obj.id !== 'string') errors.push('Missing or invalid id')
  if (!obj.name || typeof obj.name !== 'string') errors.push('Missing or invalid name')
  if (typeof obj.price !== 'number') errors.push('Missing or invalid price')
  if (!Array.isArray(obj.prizes)) {
    errors.push('Missing prizes array')
  } else {
    obj.prizes.forEach((prize, pi) => {
      if (!prize.id) errors.push(`prizes[${pi}] missing id`)
      if (!prize.label) errors.push(`prizes[${pi}] missing label`)
      if (!prize.color) errors.push(`prizes[${pi}] missing color`)
      if (!Array.isArray(prize.goods)) {
        errors.push(`prizes[${pi}] missing goods array`)
      } else {
        prize.goods.forEach((g, gi) => {
          if (!g.id) errors.push(`prizes[${pi}].goods[${gi}] missing id`)
          if (!g.name) errors.push(`prizes[${pi}].goods[${gi}] missing name`)
        })
      }
    })
  }
  return { valid: errors.length === 0, errors }
}

export function validateRecord(obj, kujiDef) {
  const errors = []
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Not an object'] }
  if (obj.type !== 'kuji-tracker-records') errors.push('Invalid type field')
  if (!obj.kujiId) errors.push('Missing kujiId')
  if (!obj.counts || typeof obj.counts !== 'object') errors.push('Missing counts object')
  if (kujiDef && obj.counts) {
    const validIds = new Set(kujiDef.prizes.flatMap(p => p.goods.map(g => g.id)))
    Object.keys(obj.counts).forEach(k => {
      if (!validIds.has(k)) errors.push(`Unknown goodsId in counts: ${k}`)
    })
  }
  return { valid: errors.length === 0, errors }
}

export function getAllGoodsIds(kujiDef) {
  if (!kujiDef) return new Set()
  return new Set(kujiDef.prizes.flatMap(p => p.goods.map(g => g.id)))
}
