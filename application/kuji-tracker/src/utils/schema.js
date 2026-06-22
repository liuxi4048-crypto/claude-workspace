function validatePrizeArray(arr, fieldName, errors) {
  arr.forEach((prize, pi) => {
    if (!prize.id) errors.push(`${fieldName}[${pi}] missing id`)
    if (!prize.label) errors.push(`${fieldName}[${pi}] missing label`)
    if (!prize.color) errors.push(`${fieldName}[${pi}] missing color`)
    if (!Array.isArray(prize.goods)) {
      errors.push(`${fieldName}[${pi}] missing goods array`)
    } else {
      prize.goods.forEach((g, gi) => {
        if (!g.id) errors.push(`${fieldName}[${pi}].goods[${gi}] missing id`)
        if (!g.name) errors.push(`${fieldName}[${pi}].goods[${gi}] missing name`)
      })
    }
  })
}

export function validateKujiDef(obj) {
  const errors = []
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Not an object'] }
  if (!obj.id || typeof obj.id !== 'string') errors.push('Missing or invalid id')
  if (!obj.name || typeof obj.name !== 'string') errors.push('Missing or invalid name')
  if (typeof obj.price !== 'number') errors.push('Missing or invalid price')
  if (!Array.isArray(obj.prizes)) {
    errors.push('Missing prizes array')
  } else {
    validatePrizeArray(obj.prizes, 'prizes', errors)
  }
  // evePrizes is optional but validated if present
  if (obj.evePrizes !== undefined) {
    if (!Array.isArray(obj.evePrizes)) {
      errors.push('evePrizes must be an array')
    } else {
      validatePrizeArray(obj.evePrizes, 'evePrizes', errors)
    }
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
  const regular = kujiDef.prizes.flatMap(p => p.goods.map(g => g.id))
  const even = (kujiDef.evePrizes ?? []).flatMap(p => p.goods.map(g => g.id))
  return new Set([...regular, ...even])
}
