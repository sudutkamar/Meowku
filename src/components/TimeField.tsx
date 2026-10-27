type TimeFieldProps = {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

export function TimeField({ value, ariaLabel, onChange }: TimeFieldProps) {
  const [hour = '08', minute = '00'] = value.split(':');
  return <div className="time-field" aria-label={ariaLabel}>
    <input aria-label={`${ariaLabel} jam`} inputMode="numeric" maxLength={2} value={hour} onChange={(event) => onChange(`${event.target.value.replace(/\D/g, '').slice(0, 2)}:${minute}`)} />
    <span aria-hidden="true">:</span>
    <input aria-label={`${ariaLabel} menit`} inputMode="numeric" maxLength={2} value={minute} onChange={(event) => onChange(`${hour}:${event.target.value.replace(/\D/g, '').slice(0, 2)}`)} />
  </div>;
}
