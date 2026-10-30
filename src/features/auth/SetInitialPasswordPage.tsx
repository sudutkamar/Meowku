import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function SetInitialPasswordPage({ email, onComplete }: { email: string; onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase belum dikonfigurasi.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi password belum sama.');
      return;
    }
    setPending(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onComplete();
  }

  return <main className="auth-page invitation-page">
    <form className="auth-card invitation-card invitation-state initial-password-card" onSubmit={submit}>
      <img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" />
      <p className="eyebrow">AKTIFKAN AKUN</p>
      <h1>Buat password akunmu</h1>
      <div className="invitation-state-copy">
        <p>Undanganmu sudah terverifikasi. Buat password supaya kamu bisa masuk lagi setelah logout.</p>
        <p className="field-hint">Akun penerima: {email}</p>
      </div>
      <div className="auth-fields">
        <label>Password baru<input aria-label="Password baru" type="password" placeholder="Minimal 6 karakter" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Ulangi password<input aria-label="Ulangi password" type="password" placeholder="Ketik ulang password" minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button type="submit" className="primary auth-submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan dan lanjutkan'}</button>
    </form>
  </main>;
}
