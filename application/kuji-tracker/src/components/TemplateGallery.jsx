import { useRef } from 'react'

export default function TemplateGallery({ onImportKuji, onOpenImageImport, onOpenBuilder }) {
  const fileRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onImportKuji(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="template-gallery">
      <div className="template-gallery-header">
        <div className="empty-app-icon">🎴</div>
        <h2>くじトラッカーへようこそ</h2>
        <p>くじ一覧の画像から自動でくじを追加できます</p>
      </div>

      <div className="template-gallery-actions">
        <button className="btn-primary btn-large" onClick={onOpenImageImport}>
          🖼️ 画像からくじを読み込む
        </button>
        <button className="btn-secondary" onClick={onOpenBuilder}>
          ✏️ 手動で作成する
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
        <button className="btn-secondary" onClick={() => fileRef.current.click()}>
          📂 JSONから追加
        </button>
      </div>
    </div>
  )
}
