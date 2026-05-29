import { useState, useEffect, useRef, useCallback } from 'react'
import { getRecord, saveRecord } from '../utils/db'
import { validateRecord } from '../utils/schema'

export function useRecords(kujiId, kujiDef) {
  const [counts, setCounts] = useState({})
  const countsRef = useRef({})

  useEffect(() => {
    if (!kujiId) {
      countsRef.current = {}
      setCounts({})
      return
    }
    getRecord(kujiId).then(rec => {
      const c = rec?.counts ?? {}
      countsRef.current = c
      setCounts(c)
    })
  }, [kujiId])

  const persist = useCallback((newCounts) => {
    if (!kujiId) return
    saveRecord({
      type: 'kuji-tracker-records',
      kujiId,
      savedAt: new Date().toISOString(),
      counts: newCounts,
      schemaVersion: 1
    })
  }, [kujiId])

  const increment = useCallback((goodsId) => {
    const next = { ...countsRef.current, [goodsId]: (countsRef.current[goodsId] ?? 0) + 1 }
    countsRef.current = next
    setCounts({ ...next })
    persist(next)
  }, [persist])

  const decrement = useCallback((goodsId) => {
    const cur = countsRef.current[goodsId] ?? 0
    if (cur <= 0) return
    const next = { ...countsRef.current, [goodsId]: cur - 1 }
    countsRef.current = next
    setCounts({ ...next })
    persist(next)
  }, [persist])

  const batchIncrement = useCallback((items) => {
    const next = { ...countsRef.current }
    for (const { goodsId, count } of items) {
      next[goodsId] = (next[goodsId] ?? 0) + count
    }
    countsRef.current = next
    setCounts({ ...next })
    persist(next)
  }, [persist])

  const reset = useCallback(() => {
    countsRef.current = {}
    setCounts({})
    persist({})
  }, [persist])

  const exportRecords = useCallback(() => {
    return JSON.stringify({
      type: 'kuji-tracker-records',
      kujiId,
      savedAt: new Date().toISOString(),
      counts: countsRef.current,
      schemaVersion: 1
    }, null, 2)
  }, [kujiId])

  const importRecords = useCallback(async (jsonStr) => {
    let obj
    try { obj = JSON.parse(jsonStr) } catch { throw new Error('JSONの解析に失敗しました') }
    const { valid, errors } = validateRecord(obj, kujiDef)
    if (!valid) throw new Error('記録データが不正です: ' + errors.join(', '))
    if (obj.kujiId !== kujiId) throw new Error(`くじIDが一致しません (expected: ${kujiId})`)
    await saveRecord(obj)
    countsRef.current = obj.counts
    setCounts({ ...obj.counts })
  }, [kujiId, kujiDef])

  return { counts, increment, decrement, batchIncrement, reset, exportRecords, importRecords }
}
