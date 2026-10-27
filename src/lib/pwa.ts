import { supabase } from './supabase';

export type PushPermission = NotificationPermission | 'unsupported' | 'setup-required';

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function getPushSupportMessage() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Notifikasi HP hanya bisa diaktifkan dari browser.';
  if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
    return 'Notifikasi HP perlu HTTPS. Buka Meowku sebagai aplikasi PWA atau gunakan alamat HTTPS.';
  }
  if (!('Notification' in window)) return 'Browser ini belum mendukung notifikasi web. Coba gunakan Chrome atau Safari versi terbaru.';
  if (!('serviceWorker' in navigator)) return 'Browser ini belum mendukung service worker yang diperlukan untuk notifikasi HP.';
  return null;
}

export async function registerMeowkuServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  if (!window.isSecureContext && !isLocalhost(window.location.hostname)) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

function decodePublicKey(value: string) {
  const normalized = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function subscribeForPush(householdId: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  if (!publicKey) throw new Error('Notifikasi HP belum dikonfigurasi. VAPID public key belum tersedia.');
  const supportMessage = getPushSupportMessage();
  if (supportMessage) throw new Error(supportMessage);
  const registration = await registerMeowkuServiceWorker();
  if (!registration || !registration.pushManager || typeof registration.pushManager.subscribe !== 'function') {
    throw new Error(/iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? 'Di iPhone/iPad, tambahkan Meowku ke Layar Utama lalu buka dari ikon Meowku.'
      : 'Browser ini belum mendukung notifikasi push. Coba Chrome atau Edge versi terbaru.');
  }
  const permission = await requestPushPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Izin notifikasi ditolak di perangkat ini.' : 'Izin notifikasi belum tersedia.');
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePublicKey(publicKey) });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Sesi pengguna tidak tersedia.');
  const subscriptionJson = JSON.parse(JSON.stringify(subscription.toJSON()));
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: userData.user.id, household_id: householdId, endpoint: subscription.endpoint, subscription: subscriptionJson, user_agent: navigator.userAgent, revoked_at: null }, { onConflict: 'endpoint' });
  if (error) throw error;
  return subscription;
}
