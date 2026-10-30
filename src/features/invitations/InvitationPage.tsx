import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SetInitialPasswordPage } from '../auth/SetInitialPasswordPage';
import { useAcceptInvitation, useDeclineInvitation, useInvitation } from './useInvitation';

function finishInvitation(targetHouseholdId?: string) {
  // Always leave the invitation route at the authenticated app dashboard;
  // preserving /app/pengguna would make a revoked link look stuck there.
  const url = new URL('/app', window.location.origin);
  if (targetHouseholdId) url.searchParams.set('household', targetHouseholdId);
  window.location.assign(`${url.pathname}${url.search}`);
}

function isStaleInvitationError(error: unknown) {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return /expired|revoked|cancelled|canceled|not found|already processed|email.*mismatch|invitation_not_found/i.test(message);
}

function InvitationState({ mark, eyebrow = 'UNDANGAN', title, children, action }: { mark: string; eyebrow?: string; title: string; children: ReactNode; action?: ReactNode }) {
  return <main className="auth-page invitation-page"><section className="auth-card invitation-card invitation-state"><span className="invitation-state-mark" aria-hidden="true">{mark}</span><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><div className="invitation-state-copy">{children}</div>{action && <div className="invitation-state-actions">{action}</div>}</section></main>;
}

export function InvitationPage({ invitationId, userId, userEmail }: { invitationId: string; userId: string; userEmail: string }) {
  const invitation = useInvitation(invitationId, userId);
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const hasRedirected = useRef(false);
  const [passwordReady, setPasswordReady] = useState(false);
  const staleInvitation = !invitation.isLoading && (
    (!invitation.error && invitation.data === null) ||
    (Boolean(invitation.error) && isStaleInvitationError(invitation.error)) ||
    Boolean(invitation.data && invitation.data.status !== 'pending')
  );
  useEffect(() => {
    if (!staleInvitation || hasRedirected.current) return;
    hasRedirected.current = true;
    // A revoked invitation must never trap an authenticated user on the
    // invitation page. Preserve the household id only for an invitation
    // that was already accepted; App verifies it against active membership.
    finishInvitation(invitation.data?.status === 'accepted' ? invitation.data.household_id : undefined);
  }, [invitation.data, staleInvitation]);
  if (invitation.isLoading) return <InvitationState mark="…" eyebrow="MEOWKU" title="Memuat undangan..."><p>Memeriksa undangan untuk <b>{userEmail}</b>.</p></InvitationState>;
  if (staleInvitation) return <InvitationState mark="↗" eyebrow="MEOWKU" title="Membuka aplikasi..."><p>Undangan ini sudah tidak aktif. Kami mengembalikanmu ke session Meowku yang aktif.</p></InvitationState>;
  if (invitation.error) return <InvitationState mark="!" title="Undangan tidak dapat dibuka"><p role="alert">Pastikan kamu masuk menggunakan email penerima undangan.</p><p className="invitation-state-detail">{invitation.error.message}</p><button className="secondary" type="button" onClick={() => finishInvitation()}>Kembali</button></InvitationState>;
  if (!invitation.data) return <InvitationState mark="?" title="Undangan tidak ditemukan"><p>Undangan ini sudah dibatalkan, sudah digunakan, atau email akunmu tidak cocok.</p><button className="secondary" type="button" onClick={() => finishInvitation()}>Kembali</button></InvitationState>;
  const details = invitation.data;
  if (details.status !== 'pending') return <InvitationState mark="↗" eyebrow="MEOWKU" title="Membuka aplikasi..."><p>Undangan ini sudah diproses. Kami mengembalikanmu ke session Meowku yang aktif.</p></InvitationState>;
  if (!passwordReady) return <SetInitialPasswordPage email={details.email} onComplete={() => setPasswordReady(true)} />;
  return <main className="auth-page invitation-page"><section className="auth-card invitation-card invitation-state invitation-accept-card"><span className="invitation-state-mark invitation-state-mark-success" aria-hidden="true">✦</span><p className="eyebrow">UNDANGAN HOUSEHOLD</p><h1>Gabung ke {details.household_name}</h1><div className="invitation-state-copy"><p><b>{details.inviter_name}</b> mengundangmu sebagai <b>{details.role === 'admin' ? 'Admin' : 'Member'}</b>.</p><p className="field-hint">Akun penerima: {details.email}</p>{(accept.error || decline.error) && <p className="auth-error" role="alert">{(accept.error ?? decline.error)?.message}</p>}</div><div className="invitation-actions"><button className="primary" type="button" disabled={accept.isPending || decline.isPending} onClick={() => accept.mutate(invitationId, { onSuccess: (joinedHousehold) => finishInvitation(joinedHousehold.id) })}>{accept.isPending ? 'Memproses...' : 'Terima undangan'}</button><button className="secondary" type="button" disabled={accept.isPending || decline.isPending} onClick={() => decline.mutate(invitationId, { onSuccess: () => finishInvitation() })}>{decline.isPending ? 'Memproses...' : 'Tolak'}</button></div></section></main>;
}
