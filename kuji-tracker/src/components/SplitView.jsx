import GoodsGrid from './GoodsGrid'

function filterPrizeGoods(prizes, counts, predicate) {
  return prizes
    .map(prize => ({
      ...prize,
      goods: prize.goods.filter(g => predicate(counts[g.id] ?? 0))
    }))
    .filter(prize => prize.goods.length > 0)
}

export default function SplitView({ prizes, counts, onIncrement, onDecrement }) {
  const acquired = filterPrizeGoods(prizes, counts, c => c >= 1)
  const missing = filterPrizeGoods(prizes, counts, c => c === 0)

  return (
    <div className="split-view">
      <div className="split-col">
        <h2 className="split-header acquired-header">獲得済み ({acquired.flatMap(p=>p.goods).length})</h2>
        {acquired.length === 0
          ? <div className="empty-state">まだ獲得なし</div>
          : <GoodsGrid prizes={acquired} counts={counts} mode="normal" onIncrement={onIncrement} onDecrement={onDecrement} />
        }
      </div>
      <div className="split-col">
        <h2 className="split-header missing-header">未獲得 ({missing.flatMap(p=>p.goods).length})</h2>
        {missing.length === 0
          ? <div className="empty-state complete-state">🎉 コンプリート！</div>
          : <GoodsGrid prizes={missing} counts={counts} mode="normal" onIncrement={onIncrement} onDecrement={onDecrement} />
        }
      </div>
    </div>
  )
}
