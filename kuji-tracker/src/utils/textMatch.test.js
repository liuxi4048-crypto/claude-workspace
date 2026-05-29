import { describe, it, expect } from 'vitest'
import { matchGoodsFromText } from './textMatch'

const DEF = {
  id: 'test', name: 'テスト', price: 800,
  prizes: [
    {
      id: 'p1', label: 'A賞', color: '#f00',
      goods: [
        { id: 'g1', name: 'ITEM ONE', sub: 'サブ説明' },
        { id: 'g2', name: 'item two', sub: '' },
        { id: 'g3', name: 'グッズ三', sub: 'THREE' },
      ]
    }
  ]
}

describe('matchGoodsFromText', () => {
  it('exact match', () => {
    const { matched } = matchGoodsFromText('ITEM ONE', DEF)
    expect(matched).toHaveLength(1)
    expect(matched[0].goodsId).toBe('g1')
    expect(matched[0].count).toBe(1)
  })

  it('partial match', () => {
    const { matched } = matchGoodsFromText('item', DEF)
    expect(matched.map(m => m.goodsId)).toContain('g1')
    expect(matched.map(m => m.goodsId)).toContain('g2')
  })

  it('case normalization', () => {
    const { matched } = matchGoodsFromText('item two', DEF)
    expect(matched[0].goodsId).toBe('g2')
  })

  it('full-width normalization', () => {
    const { matched } = matchGoodsFromText('ＩＴＥＭ ＯＮＥ', DEF)
    expect(matched.some(m => m.goodsId === 'g1')).toBe(true)
  })

  it('sub field match', () => {
    const { matched } = matchGoodsFromText('THREE', DEF)
    expect(matched[0].goodsId).toBe('g3')
  })

  it('no match returns unmatched', () => {
    const { matched, unmatched } = matchGoodsFromText('存在しない景品', DEF)
    expect(matched).toHaveLength(0)
    expect(unmatched.length).toBeGreaterThan(0)
  })

  it('duplicate accumulates count', () => {
    const { matched } = matchGoodsFromText('item two\nitem two', DEF)
    const m = matched.find(m => m.goodsId === 'g2')
    expect(m.count).toBe(2)
  })

  it('mixed matched and unmatched', () => {
    const { matched, unmatched } = matchGoodsFromText('item one\n存在しない', DEF)
    expect(matched.length).toBeGreaterThan(0)
    expect(unmatched.length).toBeGreaterThan(0)
  })

  it('handles null kujiDef', () => {
    const result = matchGoodsFromText('text', null)
    expect(result.matched).toHaveLength(0)
  })
})
