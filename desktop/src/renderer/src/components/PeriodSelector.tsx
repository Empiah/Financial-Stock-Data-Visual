export type Period = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'ALL'

interface Props {
  value: Period
  onChange: (p: Period) => void
}

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', '2Y', '5Y', 'ALL']

export function PeriodSelector({ value, onChange }: Props): JSX.Element {
  return (
    <div className="period-selector">
      {PERIODS.map((p) => (
        <button
          key={p}
          className={p === value ? 'active' : ''}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

/** Return the start date for a given period label, counting back from today */
export function periodStartDate(period: Period): string | null {
  if (period === 'ALL') return null
  const d = new Date()
  switch (period) {
    case '1M': d.setMonth(d.getMonth() - 1); break
    case '3M': d.setMonth(d.getMonth() - 3); break
    case '6M': d.setMonth(d.getMonth() - 6); break
    case '1Y': d.setFullYear(d.getFullYear() - 1); break
    case '2Y': d.setFullYear(d.getFullYear() - 2); break
    case '5Y': d.setFullYear(d.getFullYear() - 5); break
  }
  return d.toISOString().slice(0, 10)
}
