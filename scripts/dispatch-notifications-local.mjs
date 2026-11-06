const baseUrl = (process.env.SUPABASE_URL || 'http://127.0.0.1:54321').replace(/\/$/, '');
const dispatchSecret = process.env.NOTIFICATION_DISPATCH_SECRET;

if (!dispatchSecret) {
  console.error('NOTIFICATION_DISPATCH_SECRET belum diisi. Jalankan setelah secret Edge Function lokal tersedia.');
  process.exitCode = 1;
} else {
  const response = await fetch(`${baseUrl}/functions/v1/dispatch-due-notifications`, {
    method: 'POST',
    headers: { 'x-dispatch-secret': dispatchSecret },
  });
  const body = await response.text();
  console.log(body);
  if (!response.ok) process.exitCode = 1;
}
