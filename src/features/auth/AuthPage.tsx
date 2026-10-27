import { FormEvent, useState } from 'react';
import { supabase, supabaseConfigured } from '../../lib/supabase';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    let requestError: { message: string } | null = null;
    let signedUpWithoutSession = false;
    if (mode === 'signin') {
      const result = await supabase.auth.signInWithPassword({ email, password });
      requestError = result.error;
    } else if (mode === 'reset') {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
      requestError = result.error;
    } else {
      const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
      requestError = result.error;
      signedUpWithoutSession = !result.data.session;
    }
    setSubmitting(false);
    if (requestError) setError(requestError.message);
    else if (mode === 'signup' && signedUpWithoutSession) setMessage('Periksa email untuk mengonfirmasi akunmu.');
    else if (mode === 'reset') setMessage('Kalau email terdaftar, tautan reset password sudah dikirim.');
  }

  if (!supabaseConfigured) {
    return <main className="setup-required"><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><h1>Supabase belum dikonfigurasi</h1><p>Isi variabel Supabase di <code>.env.local</code>.</p></main>;
  }

  return <main className="auth-page"><div className="auth-shell">
    <section className="auth-hero" aria-label="Tentang Meowku">
      <div className="auth-brand"><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><strong>Meowku</strong></div>
      <p className="eyebrow">BIAR NGGAK RIBET</p>
      <h2>Rawat kucing jadi lebih gampang.</h2>
      <p className="auth-hero-copy">Atur jadwal, kesehatan, makanan, dan kebutuhan kucingmu di satu tempat.</p>
      <div className="auth-hero-points"><span>✓ Jadwal lebih rapi</span><span>✓ Catatan tetap aman</span><span>✓ Enak dipakai bareng</span></div>
      <img className="auth-hero-art" src="/illustrations/meowku-checklist-cat.webp" alt="Kucing Meowku membawa checklist" />
    </section>
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-card-heading"><p className="eyebrow">{mode === 'signin' ? 'HALO LAGI' : mode === 'reset' ? 'AKSES AKUN' : 'YUK MULAI'}</p><h1>{mode === 'signin' ? 'Masuk ke Meowku' : mode === 'reset' ? 'Reset password' : 'Buat akun Meowku'}</h1><p>{mode === 'signin' ? 'Lanjut rawat kucingmu dari sini.' : mode === 'reset' ? 'Kami kirim tautan untuk membuat password baru.' : 'Bikin akun dan mulai atur semuanya.'}</p></div>
      <div className="auth-fields">
        {mode === 'signup' && <label>Nama lengkap<input aria-label="Nama lengkap" placeholder="Contoh: Jack" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>}
        <label>Email<input aria-label="Email" type="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {mode !== 'reset' && <label>Password<input aria-label="Password" type="password" placeholder="Minimal 6 karakter" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>}
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-message" role="status">{message}</div>}
      <button type="submit" className="primary auth-submit" disabled={submitting}>{submitting ? 'Memproses...' : mode === 'signin' ? 'Masuk ke akun' : mode === 'reset' ? 'Kirim tautan reset' : 'Buat akun'}</button>
      {mode === 'signin' && <button type="button" className="auth-switch" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>Lupa password?</button>}
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' || mode === 'reset' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar sekarang'}</button>
    </form>
  </div></main>;
}

