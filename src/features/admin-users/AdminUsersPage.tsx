import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Database, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Household } from '../../lib/types';
import { supabase } from '../../lib/supabase';

type DirectoryUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  can_delete: boolean;
  delete_block_reason: string | null;
};
type DirectoryHousehold = {
  id: string;
  name: string;
  timezone: string;
  created_by: string;
  created_at: string;
  role: 'owner' | 'admin' | 'member';
  member_count: number;
  can_delete: boolean;
  delete_block_reason: string | null;
};

async function functionError(error: unknown) {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null;
  if (context && typeof context === 'object' && 'clone' in context && typeof context.clone === 'function') {
    try {
      const payload = await (context as Response).clone().json() as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      // Fall back to the SDK message for non-JSON responses.
    }
  }
  return error instanceof Error ? error.message : 'Operasi database pengguna gagal.';
}

function formatDate(value: string | null) {
  if (!value) return 'Belum pernah';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function displayName(user: DirectoryUser) {
  return user.full_name?.trim() || user.email || 'Pengguna tanpa email';
}

export function AdminUsersPage({ household }: { household: Household }) {
  const client = useQueryClient();
  const [section, setSection] = useState<'users' | 'households'>('users');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DirectoryUser | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<DirectoryHousehold | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationName, setConfirmationName] = useState('');
  const [localError, setLocalError] = useState('');
  const users = useQuery({
    queryKey: ['admin-user-directory', household.id],
    queryFn: async (): Promise<DirectoryUser[]> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.functions.invoke('admin-user-directory', { body: { action: 'list', householdId: household.id } });
      if (error) throw new Error(await functionError(error));
      return (data?.users ?? []) as DirectoryUser[];
    },
  });
  const households = useQuery({
    queryKey: ['admin-household-directory'],
    queryFn: async (): Promise<DirectoryHousehold[]> => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.functions.invoke('admin-user-directory', { body: { action: 'list_households' } });
      if (error) throw new Error(await functionError(error));
      return (data?.households ?? []) as DirectoryHousehold[];
    },
  });
  const removeUser = useMutation({
    mutationFn: async (user: DirectoryUser) => {
      if (!supabase || !user.email) throw new Error('Email pengguna tidak tersedia.');
      const { data, error } = await supabase.functions.invoke('admin-user-directory', {
        body: { action: 'delete', householdId: household.id, userId: user.id, confirmationEmail: confirmationEmail.trim() },
      });
      if (error) throw new Error(await functionError(error));
      if (data?.deleted !== true) throw new Error('Akun belum dihapus.');
      return data;
    },
    onSuccess: async () => {
      setSelected(null);
      setConfirmationEmail('');
      setLocalError('');
      await client.invalidateQueries({ queryKey: ['admin-user-directory', household.id] });
      await client.invalidateQueries({ queryKey: ['members', household.id] });
    },
  });
  const removeHousehold = useMutation({
    mutationFn: async (target: DirectoryHousehold) => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.functions.invoke('admin-user-directory', {
        body: { action: 'delete_household', householdId: target.id, confirmationName: confirmationName.trim() },
      });
      if (error) throw new Error(await functionError(error));
      if (data?.deleted !== true) throw new Error('Household belum dihapus.');
      return data;
    },
    onSuccess: async () => {
      const deletedId = selectedHousehold?.id;
      setSelectedHousehold(null);
      setConfirmationName('');
      setLocalError('');
      await client.invalidateQueries({ queryKey: ['admin-household-directory'] });
      await client.invalidateQueries({ queryKey: ['current-households'] });
      if (deletedId === household.id) window.location.assign('/app');
    },
  });
  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users.data ?? [];
    return (users.data ?? []).filter((user) => `${user.full_name ?? ''} ${user.email ?? ''} ${user.role}`.toLowerCase().includes(needle));
  }, [search, users.data]);
  const openDelete = (user: DirectoryUser) => {
    setSelected(user);
    setConfirmationEmail('');
    setLocalError('');
  };
  const closeDelete = () => {
    if (removeUser.isPending) return;
    setSelected(null);
    setConfirmationEmail('');
    setLocalError('');
  };
  const openHouseholdDelete = (target: DirectoryHousehold) => {
    setSelectedHousehold(target);
    setConfirmationName('');
    setLocalError('');
  };
  const closeHouseholdDelete = () => {
    if (removeHousehold.isPending) return;
    setSelectedHousehold(null);
    setConfirmationName('');
    setLocalError('');
  };
  const confirmHouseholdDelete = () => {
    if (!selectedHousehold) return;
    if (confirmationName.trim() !== selectedHousehold.name.trim()) {
      setLocalError('Nama household belum cocok.');
      return;
    }
    removeHousehold.mutate(selectedHousehold);
  };
  const confirmDelete = () => {
    if (!selected?.email) return;
    if (confirmationEmail.trim().toLowerCase() !== selected.email.toLowerCase()) {
      setLocalError('Email konfirmasi belum cocok.');
      return;
    }
    removeUser.mutate(selected);
  };

  return <section className="entity-page admin-users-page">
    <PageHeader eyebrow="ADMIN" title="Database" description="Kelola data pengguna dan household yang dapat kamu administrasikan." />
    <section className="panel admin-users-notice"><ShieldAlert size={20} aria-hidden="true" /><div><b>Akses terbatas owner dan admin</b><p>Data tetap dibatasi oleh otorisasi household. Penghapusan household hanya tersedia untuk owner yang membuat household tersebut.</p></div></section>
    <div className="database-tabs" role="tablist" aria-label="Jenis database">
      <button className={section === 'users' ? 'active' : ''} type="button" role="tab" aria-selected={section === 'users'} onClick={() => setSection('users')}><Database size={17} aria-hidden="true" /> Pengguna</button>
      <button className={section === 'households' ? 'active' : ''} type="button" role="tab" aria-selected={section === 'households'} onClick={() => setSection('households')}><Building2 size={17} aria-hidden="true" /> Household</button>
    </div>
    {section === 'users' ? <section className="panel admin-users-panel">
      <div className="section-heading"><div><p className="eyebrow">AUTH USERS</p><h2><Database size={20} aria-hidden="true" /> Pengguna terdaftar <span className="count-badge">{users.data?.length ?? 0}</span></h2></div><input className="member-search" aria-label="Cari pengguna" placeholder="Cari nama atau email" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <QueryState loading={users.isLoading} error={users.error as Error | null} empty={!users.isLoading && !users.error && !filteredUsers.length} onRetry={() => void users.refetch()}>
        <div className="admin-users-table" role="table" aria-label="Database pengguna household">
          <div className="admin-users-table-head" role="row"><span>Pengguna</span><span>Role</span><span>Terdaftar</span><span>Login terakhir</span><span>Aksi</span></div>
          {filteredUsers.map((user) => <div className="admin-users-row" role="row" key={user.id}>
            <div className="admin-user-identity"><span className="member-avatar"><UserRound size={17} aria-hidden="true" /></span><div><b>{displayName(user)}</b><small>{user.email ?? 'Email tidak tersedia'}</small><small>ID: {user.id}</small></div></div>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
            <small>{formatDate(user.created_at)}</small>
            <small>{formatDate(user.last_sign_in_at)}</small>
            <div className="admin-user-actions">{user.can_delete ? <button className="danger-action" type="button" onClick={() => openDelete(user)}><Trash2 size={15} aria-hidden="true" /> Hapus akun</button> : <span className="field-hint">{user.delete_block_reason}</span>}</div>
          </div>)}
        </div>
      </QueryState>
    </section> : <section className="panel admin-households-panel">
      <div className="section-heading"><div><p className="eyebrow">HOUSEHOLDS</p><h2><Building2 size={20} aria-hidden="true" /> Database household <span className="count-badge">{households.data?.length ?? 0}</span></h2></div></div>
      <QueryState loading={households.isLoading} error={households.error as Error | null} empty={!households.isLoading && !households.error && !households.data?.length} onRetry={() => void households.refetch()}>
        <div className="admin-households-table" role="table" aria-label="Database household">
          <div className="admin-households-table-head" role="row"><span>Household</span><span>Role</span><span>Anggota</span><span>Dibuat</span><span>Aksi</span></div>
          {households.data?.map((item) => <div className="admin-households-row" role="row" key={item.id}><div className="admin-household-identity"><span className="member-avatar"><Building2 size={17} aria-hidden="true" /></span><div><b>{item.name}</b><small>{item.timezone}</small><small>ID: {item.id}</small></div></div><span className={`role-badge role-${item.role}`}>{item.role}</span><small>{item.member_count} anggota</small><small>{formatDate(item.created_at)}</small><div className="admin-user-actions">{item.can_delete ? <button className="danger-action" type="button" onClick={() => openHouseholdDelete(item)}><Trash2 size={15} aria-hidden="true" /> Hapus household</button> : <span className="field-hint">{item.delete_block_reason}</span>}</div></div>)}
        </div>
      </QueryState>
    </section>}
    <ConfirmDialog open={Boolean(selected)} title="Hapus akun pengguna?" description={selected ? `Akun ${selected.email ?? 'ini'} akan dihapus permanen dari Supabase Auth dan akses household-nya ikut dicabut. Tindakan ini tidak dapat dibatalkan.` : ''} confirmLabel="Hapus permanen" destructive pending={removeUser.isPending} confirmDisabled={!selected?.email || confirmationEmail.trim().toLowerCase() !== selected.email.toLowerCase()} onCancel={closeDelete} onConfirm={confirmDelete}>
      <label className="confirm-email-field">Ketik ulang email pengguna untuk konfirmasi<input type="email" autoComplete="off" value={confirmationEmail} onChange={(event) => { setConfirmationEmail(event.target.value); setLocalError(''); }} placeholder={selected?.email ?? ''} /></label>
      {localError && <p className="notice" role="alert">{localError}</p>}
      {removeUser.isError && <p className="notice" role="alert">{removeUser.error.message}</p>}
    </ConfirmDialog>
    <ConfirmDialog open={Boolean(selectedHousehold)} title="Hapus household?" description={selectedHousehold ? `Semua data ${selectedHousehold.name}, termasuk anggota, kucing, jadwal, histori, dan undangan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.` : ''} confirmLabel="Hapus household" destructive pending={removeHousehold.isPending} confirmDisabled={!selectedHousehold || confirmationName.trim() !== selectedHousehold.name.trim()} onCancel={closeHouseholdDelete} onConfirm={confirmHouseholdDelete}>
      <label className="confirm-email-field">Ketik ulang nama household untuk konfirmasi<input type="text" autoComplete="off" value={confirmationName} onChange={(event) => { setConfirmationName(event.target.value); setLocalError(''); }} placeholder={selectedHousehold?.name ?? ''} /></label>
      {localError && <p className="notice" role="alert">{localError}</p>}
      {removeHousehold.isError && <p className="notice" role="alert">{removeHousehold.error.message}</p>}
    </ConfirmDialog>
  </section>;
}
