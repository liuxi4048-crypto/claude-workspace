export default function ModeBar({ mode, onToggle }) {
  return (
    <div className="mode-bar">
      <button
        className={`mode-toggle ${mode === 'quick' ? 'active' : ''}`}
        onClick={onToggle}
      >
        {mode === 'quick' ? '⚡ クイック入力中' : '⚡ クイック入力'}
      </button>
      {mode === 'quick' && (
        <span className="mode-hint">カードをタップ → +1 記録</span>
      )}
    </div>
  )
}
