type TimeFieldProps = {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

function normalizePart(value: string, maximum: number) {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  const numeric = digits ? Math.min(Number(digits), maximum) : 0;
  return String(numeric).padStart(2, '0');
}

export function TimeField({ value, ariaLabel, onChange }: TimeFieldProps) {
  const [hour = '08', minute = '00'] = value.split(':');
  const commit = (nextHour: string, nextMinute: string) => onChange(`${normalizePart(nextHour, 23)}:${normalizePart(nextMinute, 59)}`);
  return <div className="time-field" aria-label={ariaLabel}>
    <input aria-label={`${ariaLabel} jam`} inputMode="numeric" pattern="[0-9]*" maxLength={2} value={hour} onChange={(event) => onChange(`${event.target.value.replace(/\D/g, '').slice(0, 2)}:${minute}`)} onBlur={() => commit(hour, minute)} />
    <span aria-hidden="true">:</span>
    <input aria-label={`${ariaLabel} menit`} inputMode="numeric" pattern="[0-9]*" maxLength={2} value={minute} onChange={(event) => onChange(`${hour}:${event.target.value.replace(/\D/g, '').slice(0, 2)}`)} onBlur={() => commit(hour, minute)} />
  </div>;
}
