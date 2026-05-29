import { openDB } from 'idb'

const DB_NAME = 'kuji-tracker'
const DB_VERSION = 1

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('kuji-defs')) {
        db.createObjectStore('kuji-defs', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'kujiId' })
      }
    }
  })
}

export async function getKujis() {
  const db = await getDB()
  return db.getAll('kuji-defs')
}

export async function saveKuji(def) {
  if (!def?.id) throw new Error('kuji def must have id')
  const db = await getDB()
  return db.put('kuji-defs', def)
}

export async function deleteKujiDef(id) {
  if (!id) throw new Error('id required')
  const db = await getDB()
  return db.delete('kuji-defs', id)
}

export async function getRecord(kujiId) {
  if (!kujiId) return null
  const db = await getDB()
  return db.get('records', kujiId)
}

export async function saveRecord(record) {
  if (!record?.kujiId) throw new Error('record must have kujiId')
  const db = await getDB()
  return db.put('records', record)
}

export async function deleteRecord(kujiId) {
  if (!kujiId) return
  const db = await getDB()
  return db.delete('records', kujiId)
}
