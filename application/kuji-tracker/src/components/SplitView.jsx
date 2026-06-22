import GoodsGrid from './GoodsGrid'

function filterPrizeGoods(prizes, counts, predicate) {
  return (prizes ?? [])
    .map(prize => ({
      ...prize,
      goods: prize.goods.filter(g => predicate(counts[g.id] ?? 0))
    }))
    .filter(prize => prize.goods.length > 0)
}

export default function SplitView({ prizes, evePrizes, counts, onIncrement, onDecrement }) {
  const acquired = filterPrizeGoods(prizes, counts, c => c >= 1)
  const missing = filterPrizeGoods(prizes, counts, c => c === 0)
  const acquiredEven = filterPrizeGoods(evePrizes, counts, c => c >= 1)
  const missingEven = filterPrizeGoods(evePrizes, counts, c => c === 0)

  const acquiredCount = acquired.flatMap(p => p.goods).length + acquiredEven.flatMap(p => p.goods).length
  const missingCount = missing.flatMap(p => p.goods).length + missingEven.flatMap(p => p.goods).length

  return (
    <div className="split-view">
      <div className="split-col">
        <h2 className="split-header acquired-header">獲得済み ({acquiredCount})</h2>
        {acquiredCount === 0
          ? <div className="empty-state">まだ獲得なし</div>
          : <GoodsGrid prizes={acquired} evePrizes={acquiredEven} counts={counts} mode="normal" onIncrement={onIncrement} onDecrement={onDecrement} />
        }
      </div>
      <div className="split-col">
        <h2 className="split-header missing-header">未獲得 ({missingCount})</h2>
        {missingCount === 0
          ? <div className="empty-state complete-state">🎉 コンプリート！</div>
          : <GoodsGrid prizes={missing} evePrizes={missingEven} counts={counts} mode="normal" onIncrement={onIncrement} onDecrement={onDecrement} />
        }
      </div>
    </div>
  )
}
