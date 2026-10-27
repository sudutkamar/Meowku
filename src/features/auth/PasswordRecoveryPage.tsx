import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function PasswordRecoveryPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setPending(true); setError(''); setMessage('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) setError(updateError.message);
    else { setMessage('Password berhasil diperbarui. Silakan masuk kembali.'); await supabase.auth.signOut(); window.history.replaceState({}, '', '/'); }
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><p className="eyebrow">AKSES AKUN</p><h1>Buat password baru</h1><p>Gunakan password minimal 6 karakter.</p><label>Password<input aria-label="Password baru" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-message" role="status">{message}</div>}<button type="submit" className="primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan password'}</button></form></main>;
}
