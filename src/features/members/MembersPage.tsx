import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';

type MemberRole = 'owner' | 'admin' | 'member';
type MemberRow = { user_id: string; role: MemberRole; is_active: boolean; joined_at: string; full_name: string; avatar_url: string | null };

function displayName(profile: { full_name?: string | null } | null | undefined) {
  return profile?.full_name?.trim() || 'Profil belum diisi';
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

export function MembersPage({ household, onNavigate }: { household: Household; onNavigate?: (page: string) => void }) {
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [search, setSearch] = useState('');
  const [confirmation, setConfirmation] = useState<{ kind: 'role' | 'remove'; userId: string; nextRole?: 'admin' | 'member' } | null>(null);
  const access = useQuery({ queryKey: ['household-access', household.id], queryFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.rpc('household_access', { requested_household_id: household.id }); if (error) throw error; return data?.[0] ?? null; } });
  const members = useQuery({ queryKey: ['members', household.id], queryFn: async (): Promise<MemberRow[]> => {
    if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
    const { data: rows, error } = await supabase.from('household_members').select('user_id, role, is_active, joined_at').eq('household_id', household.id).eq('is_active', true).order('joined_at');
    if (error) throw error;
    const ids = (rows ?? []).map((row) => row.user_id);
    const { data: profiles, error: profileError } = ids.length ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids) : { data: [], error: null };
    if (profileError) throw profileError;
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return (rows ?? []).map((row) => { const profile = profileMap.get(row.user_id); return { ...row, role: row.role as MemberRole, full_name: displayName(profile), avatar_url: profile?.avatar_url ?? null }; });
  } });
  const invitations = useQuery({ queryKey: ['household-invitations', household.id], enabled: access.data?.can_manage_members === true, queryFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.from('household_invitations').select('id, email, role, status, created_at').eq('household_id', household.id).eq('status', 'pending').order('created_at', { ascending: false }); if (error) throw error; return data ?? []; } });
  const invite = useMutation({ mutationFn: async () => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { data, error } = await supabase.functions.invoke('invite-household-member', { body: { householdId: household.id, email, role } }); if (error) throw error; return data; }, onSuccess: () => { setEmail(''); void client.invalidateQueries({ queryKey: ['household-invitations', household.id] }); } });
  const changeRole = useMutation({ mutationFn: async ({ userId, nextRole }: { userId: string; nextRole: 'admin' | 'member' }) => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { error } = await supabase.rpc('manage_household_member', { target_household_id: household.id, target_user_id: userId, next_role: nextRole }); if (error) throw error; }, onSuccess: () => void client.invalidateQueries({ queryKey: ['members', household.id] }) });
  const remove = useMutation({ mutationFn: async (userId: string) => { if (!supabase) throw new Error('Supabase belum dikonfigurasi.'); const { error } = await supabase.rpc('remove_household_member', { target_household_id: household.id, target_user_id: userId }); if (error) throw error; }, onSuccess: () => void client.invalidateQueries({ queryKey: ['members', household.id] }) });
  const filteredMembers = useMemo(() => { const needle = search.trim().toLowerCase(); if (!needle) return members.data ?? []; return (members.data ?? []).filter((member) => member.full_name.toLowerCase().includes(needle) || member.role.toLowerCase().includes(needle)); }, [members.data, search]);
  const mutationError = invite.error ?? changeRole.error ?? remove.error;
  const canManage = access.data?.can_manage_members === true;
  const confirmRoleChange = (userId: string, nextRole: 'admin' | 'member') => setConfirmation({ kind: 'role', userId, nextRole });
  const confirmRemoval = (userId: string) => setConfirmation({ kind: 'remove', userId });
  const confirmPending = changeRole.isPending || remove.isPending;

  return <section className="entity-page members-page">
    <PageHeader eyebrow="PENGGUNA" title="Anggota household" description="Kelola anggota, nama profil, akses, dan rotasi petugas household." />
    {mutationError && <p className="notice" role="alert">{mutationError.message}</p>}
    <div className="admin-capability-panel panel"><div><p className="eyebrow">KONTROL ADMIN</p><h2>{canManage ? 'Akses admin aktif' : 'Akses anggota'}</h2><p>{canManage ? 'Kamu dapat mengelola anggota, entitas household, dan melihat histori audit.' : 'Owner atau admin dapat mengelola akses dan melihat histori audit.'}</p></div>{canManage && <div className="admin-capability-actions"><span className="role-badge role-admin">{access.data?.role === 'owner' ? 'Owner' : 'Admin'}</span><button className="secondary" type="button" onClick={() => onNavigate?.('Histori')}>Buka histori audit</button></div>}</div>
    <div className="entity-layout members-layout">
      <div className="members-sidebar">
        {canManage ? <form className="panel entity-form-card entity-form" onSubmit={(event) => { event.preventDefault(); invite.mutate(); }}><h2>Undang anggota</h2><p className="field-hint">Undangan pending akan terlihat di bawah sampai diproses.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'member')}><option value="member">Member</option><option value="admin">Admin</option></select></label><button className="primary" type="submit" disabled={invite.isPending}>{invite.isPending ? 'Mengirim...' : 'Kirim undangan'}</button>{invite.isError && <p className="notice" role="alert">Undangan gagal dikirim. {invite.error.message}</p>}{invite.isSuccess && <p className="success" role="status">Undangan berhasil dibuat.</p>}</form> : <div className="panel member-access-note"><h2>Kelola akses</h2><p>Hanya owner atau admin yang dapat mengundang, mengganti role, atau menghapus anggota.</p></div>}
        {canManage && <section className="panel pending-invitations"><div className="section-heading"><h2>Undangan pending</h2><span className="count-badge">{invitations.data?.length ?? 0}</span></div>{invitations.isLoading ? <p>Memuat undangan...</p> : invitations.error ? <p role="alert">{invitations.error.message}</p> : invitations.data?.length ? invitations.data.map((invitation) => <div className="pending-row" key={invitation.id}><div><b>{invitation.email}</b><small>{invitation.role} · {new Date(invitation.created_at).toLocaleDateString('id-ID')}</small></div><span className="status-badge">Pending</span></div>) : <p className="field-hint">Belum ada undangan pending.</p>}</section>}
      </div>
      <QueryState loading={members.isLoading || access.isLoading} error={members.error ?? access.error} empty={!members.isLoading && !members.error && !filteredMembers.length}><section className="panel member-list-panel"><div className="section-heading"><div><p className="eyebrow">DAFTAR AKTIF</p><h2>{filteredMembers.length} anggota</h2></div><input className="member-search" aria-label="Cari anggota" placeholder="Cari anggota" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="member-table" role="table" aria-label="Daftar anggota household"><div className="member-table-head" role="row"><span>Anggota</span><span>Role</span><span>Status</span><span>Aksi</span></div>{filteredMembers.map((member) => <div className="member-row" role="row" key={member.user_id}><div className="member-identity">{member.avatar_url ? <img className="member-avatar member-avatar-image" src={member.avatar_url} alt="" /> : <span className="member-avatar">{initials(member.full_name)}</span>}<div><b>{member.full_name}</b><small>{member.full_name === 'Profil belum diisi' ? 'Lengkapi profil di Pengaturan' : `Bergabung ${new Date(member.joined_at).toLocaleDateString('id-ID')}`}</small></div></div><span className={`role-badge role-${member.role}`}>{member.role}</span><span className="status-badge">Aktif</span><div className="member-actions">{canManage && member.role !== 'owner' ? <><select aria-label={`Role ${member.full_name}`} value={member.role} disabled={changeRole.isPending} onChange={(event) => confirmRoleChange(member.user_id, event.target.value as 'admin' | 'member')}><option value="admin">Admin</option><option value="member">Member</option></select><button className="row-action" type="button" disabled={remove.isPending} onClick={() => confirmRemoval(member.user_id)}>Hapus</button></> : <span className="field-hint">Tidak ada aksi</span>}</div></div>)}</div></section></QueryState>
    </div>
     <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.kind === 'remove' ? 'Hapus akses anggota?' : 'Ubah role anggota?'} description={confirmation?.kind === 'remove' ? 'Anggota ini tidak dapat lagi mengakses household setelah perubahan disimpan.' : `Role anggota akan diubah menjadi ${confirmation?.nextRole ?? 'member'}.`} confirmLabel={confirmation?.kind === 'remove' ? 'Hapus akses' : 'Simpan role'} destructive={confirmation?.kind === 'remove'} pending={confirmPending} onCancel={() => setConfirmation(null)} onConfirm={() => { if (!confirmation) return; if (confirmation.kind === 'remove') remove.mutate(confirmation.userId, { onSuccess: () => setConfirmation(null) }); else changeRole.mutate({ userId: confirmation.userId, nextRole: confirmation.nextRole ?? 'member' }, { onSuccess: () => setConfirmation(null) }); }} />
   </section>;
}
