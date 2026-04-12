import type { IndicatorParams } from '../analysis/indicators'

interface Props {
  params: IndicatorParams
  toleranceDays: number
  indexRelative: boolean
  onParamsChange: (p: IndicatorParams) => void
  onToleranceChange: (t: number) => void
  onIndexRelativeChange: (v: boolean) => void
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <label className="setting-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= min && v <= max) onChange(v)
        }}
      />
    </label>
  )
}

export function SettingsPanel({
  params,
  toleranceDays,
  indexRelative,
  onParamsChange,
  onToleranceChange,
  onIndexRelativeChange
}: Props): JSX.Element {
  return (
    <div className="settings-panel">
      <div className="settings-group">
        <span className="settings-title">MACD</span>
        <NumberInput
          label="Fast"
          value={params.macdFast}
          min={2}
          max={100}
          onChange={(v) => onParamsChange({ ...params, macdFast: v })}
        />
        <NumberInput
          label="Slow"
          value={params.macdSlow}
          min={2}
          max={200}
          onChange={(v) => onParamsChange({ ...params, macdSlow: v })}
        />
        <NumberInput
          label="Signal"
          value={params.macdSignal}
          min={2}
          max={100}
          onChange={(v) => onParamsChange({ ...params, macdSignal: v })}
        />
      </div>
      <div className="settings-group">
        <span className="settings-title">RSI</span>
        <NumberInput
          label="Period"
          value={params.rsiPeriod}
          min={2}
          max={100}
          onChange={(v) => onParamsChange({ ...params, rsiPeriod: v })}
        />
      </div>
      <div className="settings-group">
        <span className="settings-title">Signals</span>
        <NumberInput
          label="Tolerance (days)"
          value={toleranceDays}
          min={0}
          max={30}
          onChange={onToleranceChange}
        />
      </div>
      <div className="settings-group">
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={indexRelative}
            onChange={(e) => onIndexRelativeChange(e.target.checked)}
          />
          <span>S&P 500 Relative</span>
        </label>
      </div>
    </div>
  )
}
