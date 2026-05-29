import { useRef } from 'react'

export default function Header({
  kujis, activeKujiId, onKujiChange,
  onImportKuji, onExportRecords, onImportRecords, onReset,
  onExportKujiDef, onDeleteKuji
}) {
  const kujiFileRef = useRef()
  const recordFileRef = useRef()

  function handleKujiFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onImportKuji(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleRecordFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onImportRecords(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="app-header">
      <div className="header-title">🎴 くじトラッカー</div>
      <div className="header-controls">
        {kujis.length > 0 && (
          <>
            <select
              className="kuji-select"
              value={activeKujiId ?? ''}
              onChange={e => onKujiChange(e.target.value)}
            >
              {kujis.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <button className="header-btn danger" onClick={onDeleteKuji} title="このくじを削除" disabled={!activeKujiId}>✕</button>
          </>
        )}
        <input ref={kujiFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleKujiFile} />
        <button className="header-btn" onClick={() => kujiFileRef.current.click()} title="くじ定義を追加">📂</button>
        <button className="header-btn" onClick={onExportRecords} title="記録を書き出し" disabled={!activeKujiId}>💾</button>
        <button className="header-btn" onClick={onExportKujiDef} title="くじ定義を書き出し" disabled={!activeKujiId}>📋</button>
        <input ref={recordFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRecordFile} />
        <button className="header-btn" onClick={() => recordFileRef.current.click()} title="記録を読み込み" disabled={!activeKujiId}>📤</button>
        <button className="header-btn danger" onClick={onReset} title="記録をリセット" disabled={!activeKujiId}>🗑</button>
      </div>
    </header>
  )
}
