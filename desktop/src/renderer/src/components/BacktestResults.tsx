import type { Trade } from '../analysis/signals'

interface Props {
  trades: Trade[]
}

export function BacktestResults({ trades }: Props): JSX.Element {
  if (trades.length === 0) {
    return (
      <div className="backtest">
        <h2>Backtest</h2>
        <p className="backtest-empty">No completed Buy → Sell signal pairs in this period.</p>
      </div>
    )
  }

  const totalReturn = trades.reduce(
    (acc, t) => acc * (1 + t.returnPct / 100),
    1
  )
  const avgReturn = trades.reduce((s, t) => s + t.returnPct, 0) / trades.length
  const winners = trades.filter((t) => t.returnPct > 0).length

  return (
    <div className="backtest">
      <h2>Backtest — Dual-Signal Trades</h2>
      <div className="backtest-summary">
        <span>
          {trades.length} trade{trades.length !== 1 ? 's' : ''} |{' '}
          Win rate: {((winners / trades.length) * 100).toFixed(0)}% |{' '}
          Avg return: <span className={avgReturn >= 0 ? 'positive' : 'negative'}>
            {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
          </span> |{' '}
          Cumulative: <span className={totalReturn >= 1 ? 'positive' : 'negative'}>
            {totalReturn >= 1 ? '+' : ''}{((totalReturn - 1) * 100).toFixed(1)}%
          </span>
        </span>
      </div>
      <div className="backtest-table-wrap">
        <table className="backtest-table">
          <thead>
            <tr>
              <th>Buy Date</th>
              <th>Buy Price</th>
              <th>Sell Date</th>
              <th>Sell Price</th>
              <th>Days</th>
              <th>Return</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i}>
                <td>{t.buyDate}</td>
                <td>${t.buyPrice.toFixed(2)}</td>
                <td>{t.sellDate}</td>
                <td>${t.sellPrice.toFixed(2)}</td>
                <td>{t.days}</td>
                <td className={t.returnPct >= 0 ? 'positive' : 'negative'}>
                  {t.returnPct >= 0 ? '+' : ''}{t.returnPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
