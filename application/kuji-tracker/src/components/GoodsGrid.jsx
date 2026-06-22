import GoodsCard from './GoodsCard'

function PrizeSection({ prize, counts, mode, onIncrement, onDecrement, isEven }) {
  return (
    <section key={prize.id} className={`prize-section${isEven ? ' prize-section--even' : ''}`}>
      <h3 className="prize-label" style={{ borderLeftColor: prize.color }}>
        <span className="prize-badge" style={{ background: prize.color }}>{prize.label}</span>
        {isEven && <span className="even-badge">✨ Eve賞</span>}
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
  )
}

export default function GoodsGrid({ prizes, evePrizes, counts, mode, onIncrement, onDecrement }) {
  const hasEven = evePrizes && evePrizes.length > 0
  if ((!prizes || prizes.length === 0) && !hasEven) {
    return <div className="empty-state">くじ定義を読み込んでください</div>
  }
  return (
    <div className="goods-grid">
      {hasEven && (
        <div className="even-prizes-section">
          <div className="even-prizes-header">✨ Eve賞（偶数番目引き特典）</div>
          {evePrizes.map(prize => (
            <PrizeSection key={prize.id} prize={prize} counts={counts} mode={mode}
              onIncrement={onIncrement} onDecrement={onDecrement} isEven />
          ))}
        </div>
      )}
      {prizes && prizes.map(prize => (
        <PrizeSection key={prize.id} prize={prize} counts={counts} mode={mode}
          onIncrement={onIncrement} onDecrement={onDecrement} isEven={false} />
      ))}
    </div>
  )
}
