import { FormEvent, useState } from 'react';
import { useOnboarding } from './useOnboarding';
import { INDONESIA_TIMEZONES } from '../../lib/timezone';

export function OnboardingPage() {
  const [householdName, setHouseholdName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const onboarding = useOnboarding();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onboarding.mutate({ householdName, timezone });
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" />
    <h1>Siapkan rumah kamu</h1>
    <p>Semua catatan kucingmu bakal tersimpan di sini.</p>
    <input aria-label="Nama rumah" placeholder="Nama rumah" value={householdName} onChange={(event) => setHouseholdName(event.target.value)} required />
    <label>Zona waktu<select aria-label="Zona waktu" value={timezone} onChange={(event) => setTimezone(event.target.value)}>{INDONESIA_TIMEZONES.map((item) => <option key={item.value} value={item.value}>{item.label} · {item.name}</option>)}</select></label>
    {onboarding.error && <div className="auth-error" role="alert">{onboarding.error.message}</div>}
    <button type="submit" className="primary" disabled={onboarding.isPending}>{onboarding.isPending ? 'Menyimpan...' : 'Mulai'}</button>
  </form></main>;
}
