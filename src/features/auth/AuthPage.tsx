import { FormEvent, useState } from 'react';
import { supabase, supabaseConfigured, supabaseConfigurationError } from '../../lib/supabase';

function authRedirectUrl() {
  const invitationId = new URLSearchParams(window.location.search).get('invitation');
  return `${window.location.origin}/${invitationId ? `?invitation=${encodeURIComponent(invitationId)}` : ''}`;
}

function friendlyAuthError(mode: 'signin' | 'signup' | 'reset', error: { message: string }) {
  if (/failed to fetch|network error|fetch failed|network request failed/i.test(error.message)) {
    return 'Supabase tidak bisa dihubungi. Pastikan Supabase lokal sudah berjalan untuk localhost, atau URL dan publishable key Supabase production sudah terpasang pada environment deploy.';
  }
  if (mode === 'signin' && /invalid login credentials/i.test(error.message)) {
    return 'Email atau password tidak cocok di project Supabase yang sedang aktif. Data di profiles atau tabel aplikasi tidak otomatis menjadi akun login; password hanya diperiksa di auth.users. Auth localhost dan Auth deploy bisa memakai database yang berbeda. Gunakan email yang terdaftar di Auth, bukan nama profil; jika akun dibuat lewat undangan, buka link undangan atau gunakan “Lupa password?” untuk membuat password baru.';
  }
  if (mode === 'signin' && /user not found|email.*not found/i.test(error.message)) {
    return 'Email ini belum terdaftar di Auth. Periksa kembali emailnya atau buat akun baru.';
  }
  if (mode === 'signup' && /already registered|already exists|user already/i.test(error.message)) {
    return 'Email ini sudah terdaftar di Auth. Kembali ke Masuk atau gunakan “Lupa password?” jika passwordnya tidak diketahui.';
  }
  return error.message;
}

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSignupShortcut, setShowSignupShortcut] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    setConfirmationEmail('');
    setShowSignupShortcut(false);
    let requestError: { message: string } | null = null;
    let signedUpWithoutSession = false;
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'signin') {
      const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      requestError = result.error;
    } else if (mode === 'reset') {
      const result = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: authRedirectUrl() });
      requestError = result.error;
    } else {
      const result = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: authRedirectUrl() } });
      requestError = result.error;
      signedUpWithoutSession = !result.data.session;
      if (!requestError && signedUpWithoutSession) {
        setConfirmationEmail(normalizedEmail);
        setMessage('Akun berhasil dibuat. Periksa email untuk mengonfirmasi akunmu sebelum masuk.');
      }
    }
    setSubmitting(false);
    if (requestError) {
      if (mode === 'signin' && /email\s+not\s+confirmed|email belum dikonfirmasi|not confirmed/i.test(requestError.message)) {
        setConfirmationEmail(normalizedEmail);
        setError('Email kamu belum dikonfirmasi. Kirim ulang email konfirmasi lalu buka tautannya.');
      } else {
        setShowSignupShortcut(mode === 'signin' && /invalid login credentials|user not found|email.*not found/i.test(requestError.message));
        setError(friendlyAuthError(mode, requestError));
      }
    } else if (mode === 'signup' && !signedUpWithoutSession) setMessage('Akun berhasil dibuat dan kamu sudah masuk.');
    else if (mode === 'reset') setMessage('Kalau email terdaftar, tautan reset password sudah dikirim.');
  }

  async function resendConfirmation() {
    if (!supabase || !confirmationEmail) return;
    setResending(true);
    setError('');
    setMessage('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: authRedirectUrl() } });
    setResending(false);
    if (resendError) setError(resendError.message);
    else setMessage('Email konfirmasi dikirim ulang. Cek inbox dan folder spam.');
  }

  async function sendMagicLink() {
    if (!supabase) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Masukkan email yang valid dulu.');
      setMessage('');
      return;
    }
    setSendingMagicLink(true);
    setError('');
    setMessage('');
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: authRedirectUrl(),
        shouldCreateUser: false,
      },
    });
    setSendingMagicLink(false);
    if (magicLinkError) setError(magicLinkError.message);
    else setMessage('Kalau email terdaftar, link masuk sudah dikirim. Cek inbox dan folder spam.');
  }

  if (!supabaseConfigured) {
    return <main className="setup-required"><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><h1>{supabaseConfigurationError ? 'Konfigurasi production belum benar' : 'Supabase belum dikonfigurasi'}</h1><p>{supabaseConfigurationError ?? 'Isi variabel Supabase di .env.local.'}</p></main>;
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
      {showSignupShortcut && mode === 'signin' && <button type="button" className="auth-switch" onClick={() => { setMode('signup'); setError(''); setMessage(''); setConfirmationEmail(''); setShowSignupShortcut(false); }}>Buat akun di project ini</button>}
      {confirmationEmail && <button type="button" className="auth-switch" disabled={resending} onClick={() => void resendConfirmation()}>{resending ? 'Mengirim ulang...' : 'Kirim ulang email konfirmasi'}</button>}
      <button type="submit" className="primary auth-submit" disabled={submitting}>{submitting ? 'Memproses...' : mode === 'signin' ? 'Masuk ke akun' : mode === 'reset' ? 'Kirim tautan reset' : 'Buat akun'}</button>
      {mode === 'signin' && <button type="button" className="auth-switch" disabled={sendingMagicLink} onClick={() => void sendMagicLink()}>{sendingMagicLink ? 'Mengirim link masuk...' : 'Masuk dengan link email'}</button>}
      {mode === 'signin' && <button type="button" className="auth-switch" onClick={() => { setMode('reset'); setError(''); setMessage(''); setConfirmationEmail(''); }}>Lupa password?</button>}
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' || mode === 'reset' ? 'signup' : 'signin'); setError(''); setMessage(''); setConfirmationEmail(''); }}>{mode === 'signup' ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar sekarang'}</button>
    </form>
  </div></main>;
}

