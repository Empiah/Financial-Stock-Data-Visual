import { useEffect, useMemo, useRef, useState } from 'react'
import tickerCsv from '../data/tickers.csv?raw'

interface Props {
  onSubmit: (ticker: string) => void
  disabled?: boolean
}

interface TickerRow {
  ticker: string
  name: string
}

function parseTickerCsv(csv: string): TickerRow[] {
  // Copied from Data/ticker_list.csv at /home/user/Financial-Stock-Data-Visual/.
  // Format: Wiki/Stock,ticker,Company
  //   WIKI/AAPL,AAPL,"Apple Inc (AAPL) Prices, Dividends, Splits and Trading Volume"
  const rows: TickerRow[] = []
  const lines = csv.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cells = splitCsvLine(line)
    if (cells.length < 3) continue
    const ticker = cells[1]!.trim()
    // Strip the boilerplate " Prices, Dividends, Splits and Trading Volume" tail.
    const name = cells[2]!
      .replace(/\s*Prices,\s*Dividends,\s*Splits and Trading Volume\s*$/i, '')
      .replace(/\s*\([A-Z.]+\)\s*$/i, '')
      .trim()
    if (ticker) rows.push({ ticker, name: name || ticker })
  }
  return rows
}

/** Minimal CSV splitter that respects double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

export function TickerInput({ onSubmit, disabled }: Props): JSX.Element {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const tickers = useMemo(() => parseTickerCsv(tickerCsv), [])

  const suggestions = useMemo(() => {
    const q = value.trim().toUpperCase()
    if (!q) return []
    return tickers
      .filter(
        (t) =>
          t.ticker.startsWith(q) ||
          t.name.toUpperCase().includes(q)
      )
      .slice(0, 8)
  }, [value, tickers])

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions.length])

  const submit = (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    setValue(t)
    setOpen(false)
    onSubmit(t)
  }

  return (
    <div className="ticker-input">
      <input
        ref={inputRef}
        type="text"
        placeholder="Ticker (e.g. AAPL)"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so click on suggestion still registers
          setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const chosen = suggestions[activeIndex]
            submit(chosen ? chosen.ticker : value)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActiveIndex((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button
              key={s.ticker}
              className={i === activeIndex ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault()
                submit(s.ticker)
              }}
            >
              <strong>{s.ticker}</strong> — {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
