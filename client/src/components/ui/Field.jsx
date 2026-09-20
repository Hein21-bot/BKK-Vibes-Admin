import { titleCase } from '../../lib/format.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
    </label>
  );
}

export function TextInput({ label, className, ...props }) {
  return (
    <Field label={label} className={className}>
      <input className="input" {...props} />
    </Field>
  );
}

export function SelectInput({ label, options, includeBlank, className, ...props }) {
  const { t } = useI18n();
  const blank = includeBlank === undefined ? t('common.all') : includeBlank;
  return (
    <Field label={label} className={className}>
      <select className="input" {...props}>
        {blank !== false && <option value="">{blank}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? titleCase(o) : o.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function TextArea({ label, className, ...props }) {
  return (
    <Field label={label} className={className}>
      <textarea className="input min-h-[80px]" {...props} />
    </Field>
  );
}
