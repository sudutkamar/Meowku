# QA Auth Undangan + Password

Tanggal: 2026-10-30 11:45 Asia/Jakarta  
Status implementasi: PASS  
Deployment production: tidak dilakukan

## Perubahan

- `src/features/auth/SetInitialPasswordPage.tsx` menambahkan setup password wajib setelah session undangan terverifikasi.
- `src/features/invitations/InvitationPage.tsx` hanya menampilkan acceptance setelah password berhasil disimpan.
- `src/features/auth/AuthPage.tsx` mempertahankan login password, reset password, dan menambahkan magic link dengan `shouldCreateUser: false`.
- `supabase/migrations/20261029000300_explicit_household_invitation_acceptance.sql` tetap menjadi sumber acceptance: email harus cocok dan membership tidak dibuat saat user Auth dibuat.

## Bukti automated

- `npm run typecheck` — PASS.
- `npm test` — PASS, 167 test.
- `npm run build` — PASS.
- Scan `dist`, `src`, dan `public` untuk `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEYS`, serta secret lokal — tidak ditemukan.

## Bukti E2E Supabase lokal

Dengan Supabase CLI lokal, Edge Functions, dan Mailpit aktif:

1. Membuat owner Auth nyata dengan password.
2. Membuat household lewat RPC `create_household`.
3. Mengirim undangan lewat `invite-household-member`.
4. Mengambil email undangan nyata dari Mailpit dan memvalidasi token invite.
5. Membuat session penerima dari token invite.
6. Memastikan invitation berstatus `pending` dan penerima belum menjadi member.
7. Menyimpan password penerima lewat `auth.updateUser`.
8. Menerima undangan lewat `accept_household_invitation`.
9. Logout.
10. Login ulang dengan email + password yang baru dibuat.
11. Memastikan household terbaca melalui RLS.

Hasil: PASS.

## Bukti security E2E

- User bukan penerima mendapat 0 row dari `get_household_invitation`.
- User bukan penerima mendapat HTTP 404 dari fallback Edge Function.
- User penerima tidak mendapat membership sebelum acceptance.
- Acceptance menghasilkan role `member` dan `is_active = true`.

Hasil: PASS.

## Catatan lingkungan

Database lokal awalnya masih memakai function `handle_new_user` dari migration lama, sehingga invitation lama auto-accepted. Migration `20261029000300` diterapkan ke database lokal tanpa reset dan tanpa menyentuh remote; E2E kemudian diulang memakai invitation baru dan lulus.

Fixture E2E lokal tidak dihapus karena penghapusan household ditolak oleh policy audit immutable (`audit_events_are_immutable`). Trigger audit tidak dibypass. Tidak ada fixture atau perubahan yang dikirim ke production.

Visual QA browser localhost belum dijalankan karena browser automation Windows menolak URL lokal. API/Auth/DB E2E tetap lulus secara nyata.
