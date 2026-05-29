import { describe, it, expect } from 'vitest'
import { validateKujiDef, validateRecord } from './schema'
import { computeSummary } from './summary'

describe('validateKujiDef', () => {
  const valid = {
    id: 'test', name: 'Test', price: 800, schemaVersion: 1,
    prizes: [{ id: 'p1', label: 'A賞', color: '#f00', goods: [{ id: 'g1', name: 'Item 1' }] }]
  }
  it('accepts valid def', () => expect(validateKujiDef(valid).valid).toBe(true))
  it('rejects missing id', () => expect(validateKujiDef({ ...valid, id: '' }).valid).toBe(false))
  it('rejects missing prizes', () => expect(validateKujiDef({ ...valid, prizes: undefined }).valid).toBe(false))
  it('rejects prize missing goods', () => {
    const bad = { ...valid, prizes: [{ id: 'p1', label: 'A', color: '#f' }] }
    expect(validateKujiDef(bad).valid).toBe(false)
  })
})

describe('validateRecord', () => {
  const def = {
    id: 'k1', name: 'K', price: 800, prizes: [
      { id: 'p1', label: 'A', color: '#f', goods: [{ id: 'g1', name: 'Item' }] }
    ]
  }
  const rec = { type: 'kuji-tracker-records', kujiId: 'k1', counts: { g1: 2 }, schemaVersion: 1 }
  it('accepts valid record', () => expect(validateRecord(rec, def).valid).toBe(true))
  it('rejects wrong type', () => expect(validateRecord({ ...rec, type: 'wrong' }, def).valid).toBe(false))
  it('rejects orphan goodsId', () => expect(validateRecord({ ...rec, counts: { unknown: 1 } }, def).valid).toBe(false))
})

describe('computeSummary', () => {
  const def = {
    id: 'k1', name: 'K', price: 800, prizes: [
      { id: 'p1', label: 'A', color: '#f', goods: [{ id: 'g1', name: 'I1' }, { id: 'g2', name: 'I2' }] }
    ]
  }
  it('computes correct stats', () => {
    const s = computeSummary(def, { g1: 3, g2: 1 })
    expect(s.totalGoods).toBe(2)
    expect(s.totalDraws).toBe(4)
    expect(s.acquired).toBe(2)
    expect(s.duplicates).toBe(1)
    expect(s.missing).toBe(0)
    expect(s.pct).toBe(100)
  })
  it('handles null def', () => expect(computeSummary(null, {}).totalGoods).toBe(0))
})
