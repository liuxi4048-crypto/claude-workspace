export default function SummaryBar({ summary }) {
  const { totalDraws, acquired, duplicates, missing, totalGoods } = summary
  return (
    <div className="summary-bar">
      <div className="stat-chip">
        <span className="stat-label">総引き数</span>
        <span className="stat-value">{totalDraws}</span>
      </div>
      <div className="stat-chip acquired">
        <span className="stat-label">獲得</span>
        <span className="stat-value">{acquired}</span>
      </div>
      <div className="stat-chip duplicate">
        <span className="stat-label">被り</span>
        <span className="stat-value">{duplicates}</span>
      </div>
      <div className="stat-chip missing">
        <span className="stat-label">未獲得</span>
        <span className="stat-value">{missing}/{totalGoods}</span>
      </div>
    </div>
  )
}
