import { useState, useEffect, useCallback } from 'react'
import { getKujis, saveKuji, deleteKujiDef, deleteRecord } from '../utils/db'
import { validateKujiDef } from '../utils/schema'

export function useKujiData() {
  const [kujis, setKujis] = useState([])
  const [activeKujiId, setActiveKujiId] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const all = await getKujis()
    setKujis(all)
    return all
  }, [])

  useEffect(() => {
    reload().then(all => {
      if (all.length > 0) setActiveKujiId(all[0].id)
      setLoading(false)
    })
  }, [reload])

  const importKuji = useCallback(async (jsonStr) => {
    let obj
    try { obj = JSON.parse(jsonStr) } catch { throw new Error('JSONの解析に失敗しました') }
    const { valid, errors } = validateKujiDef(obj)
    if (!valid) throw new Error('くじ定義が不正です: ' + errors.join(', '))
    await saveKuji(obj)
    const all = await reload()
    setActiveKujiId(obj.id)
    return obj
  }, [reload])

  const removeKuji = useCallback(async (id) => {
    await deleteKujiDef(id)
    await deleteRecord(id)
    const all = await reload()
    if (activeKujiId === id) {
      setActiveKujiId(all.length > 0 ? all[0].id : null)
    }
  }, [activeKujiId, reload])

  const activeKuji = kujis.find(k => k.id === activeKujiId) ?? null

  return { kujis, activeKujiId, setActiveKujiId, activeKuji, loading, importKuji, removeKuji }
}
