import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneMedia || iosStandalone;
}

function isSafeOrigin() {
  const hostname = window.location.hostname;
  return window.isSecureContext || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [safeOrigin, setSafeOrigin] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    setSafeOrigin(isSafeOrigin());
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return <p className="install-app-state" role="status">Meowku sudah terpasang sebagai aplikasi.</p>;
  if (promptEvent) return <button className="secondary install-app-button" type="button" onClick={() => void install()}><Download size={16} /> Pasang Meowku</button>;
  if (!safeOrigin) return <div className="install-app-help" role="status"><strong>Instalasi HP membutuhkan HTTPS.</strong><span>Alamat IP lokal dengan HTTP belum bisa dipasang sebagai aplikasi atau menjalankan notifikasi push. Gunakan alamat HTTPS, lalu pilih “Tambahkan ke layar utama”.</span></div>;
  if (isAppleMobile()) return <p className="install-app-help">Di iPhone/iPad, buka menu Bagikan lalu pilih “Tambahkan ke Layar Utama”.</p>;
  return <p className="install-app-help">Jika tombol pasang belum muncul, buka Meowku melalui HTTPS lalu pilih “Tambahkan ke layar utama” dari menu browser.</p>;
}
