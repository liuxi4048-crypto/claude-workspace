import GoodsCard from './GoodsCard'

export default function GoodsGrid({ prizes, counts, mode, onIncrement, onDecrement }) {
  if (!prizes || prizes.length === 0) {
    return <div className="empty-state">くじ定義を読み込んでください</div>
  }
  return (
    <div className="goods-grid">
      {prizes.map(prize => (
        <section key={prize.id} className="prize-section">
          <h3 className="prize-label" style={{ borderLeftColor: prize.color }}>
            <span className="prize-badge" style={{ background: prize.color }}>{prize.label}</span>
          </h3>
          <div className="goods-list">
            {prize.goods.map(goods => (
              <GoodsCard
                key={goods.id}
                goods={goods}
                count={counts[goods.id] ?? 0}
                mode={mode}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
