interface Props {
  price: number
  macd: number | null
  rsi: number | null
  performance: Record<string, number | null>
}

function fmt(n: number | null, decimals = 2): string {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function pctClass(n: number | null): string {
  if (n == null) return ''
  return n >= 0 ? 'positive' : 'negative'
}

export function MetricsBar({ price, macd, rsi, performance }: Props): JSX.Element {
  return (
    <div className="metrics-bar">
      <div className="metric">
        <span className="metric-label">Price</span>
        <span className="metric-value">${fmt(price)}</span>
      </div>
      <div className="metric">
        <span className="metric-label">MACD</span>
        <span className="metric-value">{fmt(macd)}</span>
      </div>
      <div className="metric">
        <span className="metric-label">RSI</span>
        <span className={`metric-value ${rsi != null && rsi > 70 ? 'negative' : rsi != null && rsi < 30 ? 'positive' : ''}`}>
          {fmt(rsi, 1)}
        </span>
      </div>
      <div className="metric-divider" />
      {Object.entries(performance).map(([label, pct]) => (
        <div className="metric" key={label}>
          <span className="metric-label">{label}</span>
          <span className={`metric-value ${pctClass(pct)}`}>
            {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
