// Small Tailwind form/layout helpers for the pricing calculator pages.

export function NumField({ label, value, onChange, unit, step = 1, min, hint, placeholder, disabled }) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {unit ? <span className="ml-1 lowercase text-ink2">{unit}</span> : null}
      </span>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
      {hint ? <span className="mt-1 block text-xs text-ink2">{hint}</span> : null}
    </label>
  );
}

// value stored as a fraction (0.20) but edited as a percent (20)
export function PctField({ label, value, onChange, step = 0.5, hint, disabled }) {
  return (
    <label className="block">
      <span className="label">
        {label} <span className="text-ink2">%</span>
      </span>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? +(value * 100).toFixed(4) : ''}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value) / 100)}
      />
      {hint ? <span className="mt-1 block text-xs text-ink2">{hint}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({ title, children, right }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function StatRow({ label, value, strong }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-edge py-2 text-sm last:border-0 ${
        strong ? 'font-bold text-ink' : 'text-ink2'
      }`}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function IconButton({ onClick, title, children = '×' }) {
  return (
    <button
      type="button"
      className="rounded px-2 text-ink2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
