import { useState } from 'react'
import { matchGoodsFromText } from '../utils/textMatch'

export default function QuickImportModal({ kujiDef, onConfirm, onClose }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)

  function handleTextChange(e) {
    setText(e.target.value)
    setPreview(null)
  }

  function handleAnalyze() {
    if (!text.trim()) return
    setPreview(matchGoodsFromText(text, kujiDef))
  }

  function handleConfirm() {
    if (!preview || preview.matched.length === 0) return
    onConfirm({ matched: preview.matched })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="テキスト一括入力" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📝 テキスト一括入力</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-desc">当選結果のテキストを貼り付けてください。景品名と照合して自動記録します。</p>
        <textarea
          className="modal-textarea"
          value={text}
          onChange={handleTextChange}
          placeholder="例：&#10;MAHIRU PARKA&#10;まひるパーカー&#10;A賞 フィギュア"
          rows={6}
        />
        <div className="modal-actions">
          <button className="btn-primary" onClick={handleAnalyze} disabled={!text.trim()}>
            解析
          </button>
        </div>

        {preview && (
          <div className="modal-preview">
            {preview.matched.length > 0 ? (
              <>
                <div className="modal-preview-title">✅ {preview.matched.length}種類がマッチしました</div>
                <ul className="modal-matched-list">
                  {preview.matched.map(m => (
                    <li key={m.goodsId} className="modal-matched-item">
                      <span className="modal-matched-name">{m.goodsName}</span>
                      <span className="count-badge">+{m.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="modal-unmatched-title">マッチした景品がありませんでした</div>
            )}
            {preview.unmatched.length > 0 && (
              <div className="modal-unmatched">
                ⚠️ 未マッチ: {preview.unmatched.join('、')}
              </div>
            )}
            {preview.matched.length > 0 && (
              <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>キャンセル</button>
                <button className="btn-primary" onClick={handleConfirm}>確定して記録</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
