import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Meowku UI error', error, info); }
  render() {
    if (this.state.error) return <main className="error-recovery"><div className="error-orbit error-orbit-one" /><div className="error-orbit error-orbit-two" /><section className="error-recovery-card" role="alert"><div className="error-brand"><img src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp" alt="Logo Meowku" /><span>Meowku</span></div><div className="error-illustration"><div className="error-icon"><AlertTriangle size={28} aria-hidden="true" /></div><Sparkles className="error-sparkle sparkle-one" size={18} aria-hidden="true" /><Sparkles className="error-sparkle sparkle-two" size={13} aria-hidden="true" /></div><p className="eyebrow">ADA MASALAH</p><h1>Halaman lagi rewel</h1><p className="error-description">Ada bagian yang belum kebuka. Data kamu tetap aman. Coba muat ulang halaman ini.</p><button type="button" className="primary error-retry" onClick={() => window.location.reload()}><RefreshCw size={17} aria-hidden="true" /> Muat ulang</button><p className="error-help">Kalau masih sama, tunggu sebentar lalu coba lagi.</p></section><footer className="error-footer">Rawat kucing tanpa ribet bersama Meowku</footer></main>;
    return this.props.children;
  }
}
