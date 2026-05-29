import { useCallback } from 'react'

function getStateClass(count) {
  if (count === 0) return 'state-grey'
  if (count === 1) return 'state-green'
  return 'state-orange'
}

export default function GoodsCard({ goods, count, mode, onIncrement, onDecrement }) {
  const stateClass = getStateClass(count)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onIncrement(goods.id)
  }, [goods.id, onIncrement])

  const handleDecrement = useCallback((e) => {
    e.stopPropagation()
    onDecrement(goods.id)
  }, [goods.id, onDecrement])

  return (
    <div
      className={`goods-card ${stateClass} ${mode === 'quick' ? 'quick-mode' : ''}`}
      onClick={mode === 'quick' ? handleClick : undefined}
    >
      {count > 0 && <span className="count-badge">{count}</span>}
      {goods.img ? (
        <img src={goods.img} alt={goods.name} loading="lazy" className="goods-img" />
      ) : (
        <div className="goods-img-placeholder">📦</div>
      )}
      <div className="goods-info">
        <div className="goods-name">{goods.name}</div>
        {goods.sub && <div className="goods-sub">{goods.sub}</div>}
      </div>
      {mode === 'normal' && (
        <div className="goods-controls">
          <button className="btn-decrement" onClick={handleDecrement} disabled={count === 0}>−</button>
          <button className="btn-increment" onClick={handleClick}>＋</button>
        </div>
      )}
    </div>
  )
}
