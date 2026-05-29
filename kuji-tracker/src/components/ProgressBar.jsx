export default function ProgressBar({ value }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="progress-label">{value}%</span>
    </div>
  )
}
