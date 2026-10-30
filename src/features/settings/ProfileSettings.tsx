import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export async function fetchProfile() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Sesi pengguna tidak ditemukan.');
  const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', auth.user.id).single();
  if (error) throw error;
  return { ...data, email: auth.user.email ?? '' };
}

export function ProfileSettings({ onSaved, embedded = false }: { onSaved?: () => void; embedded?: boolean }) {
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['profile-settings'], enabled: Boolean(supabase), queryFn: fetchProfile });
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  useEffect(() => { if (profile.data && hydratedId !== profile.data.id) { setHydratedId(profile.data.id); setFullName(profile.data.full_name); setAvatarUrl(profile.data.avatar_url ?? ''); } }, [profile.data, hydratedId]);
  const save = useMutation({ mutationFn: async () => { if (!supabase || !profile.data) throw new Error('Profil belum tersedia.'); const cleanName = fullName.trim(); if (!cleanName) throw new Error('Nama profil wajib diisi.'); const { data, error } = await supabase.from('profiles').update({ full_name: cleanName, avatar_url: avatarUrl.trim() || null }).eq('id', profile.data.id).select('id, full_name, avatar_url').single(); if (error) throw error; const { error: authError } = await supabase.auth.updateUser({ data: { full_name: cleanName } }); if (authError) throw authError; return data; }, onSuccess: (data) => { client.setQueryData(['profile-settings'], (current: typeof profile.data) => current ? { ...current, ...data } : data); void client.invalidateQueries({ queryKey: ['members'] }); void client.invalidateQueries({ queryKey: ['schedule-history-members'] }); void client.invalidateQueries({ queryKey: ['history-actors'] }); onSaved?.(); } });
  return <section className={`panel profile-settings-card${embedded ? ' profile-settings-embedded' : ''}`}><div className="profile-settings-heading"><div><p className="eyebrow">PROFIL SAYA</p><h2>Edit profile</h2><p className="field-hint">Nama ini akan tampil di daftar anggota, histori, dan penanggung jawab jadwal.</p></div>{avatarUrl && <img className="profile-preview" src={avatarUrl} alt="Preview avatar" />}</div>{profile.isLoading ? <p>Memuat profil...</p> : profile.error ? <p className="notice" role="alert">{profile.error.message}</p> : <form className="profile-settings-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><label>Nama lengkap<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} placeholder="Contoh: Jamal" required /></label><label>Email<input value={profile.data?.email ?? ''} disabled /></label><label>URL avatar <span className="field-hint">Opsional</span><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></label><button className="primary" type="submit" disabled={save.isPending}>{save.isPending ? 'Menyimpan...' : 'Simpan profil'}</button>{save.error && <p className="notice" role="alert">{save.error.message}</p>}{save.isSuccess && <p className="success" role="status">Profil berhasil diperbarui.</p>}</form>}</section>;
}
