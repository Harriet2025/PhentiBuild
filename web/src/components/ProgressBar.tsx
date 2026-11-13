/** Same markup as progressMarkup() in dashboard.js / projects.js. */
export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`progress${className ? ` ${className}` : ''}`}>
      <div className="progress-track">
        <div className={`progress-bar${value === 100 ? ' is-complete' : ''}`} style={{ width: `${value}%` }} />
      </div>
      <span className="progress-value">{value}%</span>
    </div>
  )
}
