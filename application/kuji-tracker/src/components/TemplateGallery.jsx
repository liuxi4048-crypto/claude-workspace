import { useState, useEffect, useRef } from 'react'

const TEMPLATES = [
  { url: `${import.meta.env.BASE_URL}templates/template-simple.json`, label: 'シンプル3賞' },
  { url: `${import.meta.env.BASE_URL}templates/template-collab.json`, label: 'コラボ5賞' },
]

export default function TemplateGallery({ onImportKuji }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useEffect(() => {
    Promise.allSettled(TEMPLATES.map(t => fetch(t.url).then(r => r.json())))
      .then(results => {
        const loaded = results
          .map((r, i) => r.status === 'fulfilled' ? { ...TEMPLATES[i], data: r.value } : null)
          .filter(Boolean)
        setTemplates(loaded)
        setLoading(false)
      })
  }, [])

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
        <p>テンプレートを選ぶか、JSONファイルから追加してください</p>
      </div>

      {!loading && templates.length > 0 && (
        <div className="template-cards">
          {templates.map(tpl => (
            <div key={tpl.data.id} className="template-card">
              <div className="template-card-name">{tpl.data.name}</div>
              <div className="template-card-meta">
                {tpl.data.prizes.length}賞 ·
                {tpl.data.prizes.reduce((s, p) => s + p.goods.length, 0)}景品 ·
                {tpl.data.price}円/回
              </div>
              <div className="template-card-prizes">
                {tpl.data.prizes.map(p => (
                  <span key={p.id} className="prize-chip" style={{ background: p.color }}>{p.label}</span>
                ))}
              </div>
              <button
                className="btn-primary"
                onClick={() => onImportKuji(JSON.stringify(tpl.data))}
              >
                このテンプレートを使う
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="template-gallery-footer">
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
        <button className="btn-secondary" onClick={() => fileRef.current.click()}>
          📂 JSONから追加
        </button>
      </div>
    </div>
  )
}
