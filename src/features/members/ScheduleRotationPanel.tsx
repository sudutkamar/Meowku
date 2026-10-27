import { useEffect, useMemo, useState } from 'react';
import type { Household } from '../../lib/types';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DateInput } from '../../components/DateInput';
import { householdToday, shiftLocalDate } from '../../lib/timezone';
import { useArchiveScheduleAssignee, useSaveScheduleAssignee, useScheduleRotation, useScheduleRotationMembers, useSaveScheduleRotation, type RotationDay } from './useScheduleRotation';

const weekdays = [{ value: 1, label: 'Senin' }, { value: 2, label: 'Selasa' }, { value: 3, label: 'Rabu' }, { value: 4, label: 'Kamis' }, { value: 5, label: 'Jumat' }, { value: 6, label: 'Sabtu' }, { value: 7, label: 'Minggu' }];
function nextMonthDate(timezone: string) { return shiftLocalDate(householdToday(timezone), 30); }
function selectedHasAssignee(days: RotationDay[], assigneeId: string) { return days.some((day) => day.assignee_id === assigneeId); }

export function ScheduleRotationPanel({ household, canManage }: { household: Household; canManage: boolean }) {
  const rotation = useScheduleRotation(household.id);
  const assignees = useScheduleRotationMembers(household.id);
  const saveAssignee = useSaveScheduleAssignee(household.id);
  const archiveAssignee = useArchiveScheduleAssignee(household.id);
  const save = useSaveScheduleRotation(household.id);
  const timezone = household.timezone ?? 'Asia/Jakarta';
  const [startDate, setStartDate] = useState(() => householdToday(timezone));
  const [endDate, setEndDate] = useState(() => nextMonthDate(timezone));
  const [days, setDays] = useState<RotationDay[]>([]);
  const [newName, setNewName] = useState('');
  const [editingAssignee, setEditingAssignee] = useState<{ id: string; displayName: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; displayName: string } | null>(null);
  useEffect(() => { if (!rotation.data) return; setStartDate(rotation.data.start_date); setEndDate(rotation.data.end_date); setDays(rotation.data.days); }, [rotation.data]);
  const selected = useMemo(() => new Map(days.map((day) => [day.weekday, day.assignee_id])), [days]);
  function setDay(weekday: number, assigneeId: string) { setDays((current) => assigneeId ? [...current.filter((day) => day.weekday !== weekday), { weekday, assignee_id: assigneeId }] : current.filter((day) => day.weekday !== weekday)); }
  if (!canManage) return null;
  function editAssignee(id: string, displayName: string) { setEditingAssignee({ id, displayName }); }
  function cancelEdit() { setEditingAssignee(null); }
  function submitAssignee() {
    const displayName = newName.trim();
    if (!displayName) return;
    saveAssignee.mutate({ displayName }, { onSuccess: () => setNewName('') });
  }
  function saveEditedAssignee() {
    if (!editingAssignee?.displayName.trim()) return;
    saveAssignee.mutate({ displayName: editingAssignee.displayName.trim(), assigneeId: editingAssignee.id }, { onSuccess: cancelEdit });
  }
  return <section className="panel schedule-rotation-panel">
    <div className="section-heading"><div><p className="eyebrow">ROTASI PETUGAS</p><h2>Siapa yang bertugas?</h2><p className="field-hint">Pilih petugas untuk tiap hari. Jadwal baru akan mengikuti pilihan ini.</p></div></div>
    <QueryState loading={rotation.isLoading || assignees.isLoading} error={rotation.error ?? assignees.error}>
      <div className="assignee-create"><label><span>Tambah petugas</span><input value={newName} maxLength={120} placeholder="Contoh: Budi / Pengasuh pagi" onChange={(event) => setNewName(event.target.value)} /></label><button className="secondary" type="button" disabled={saveAssignee.isPending || !newName.trim()} onClick={submitAssignee}>{saveAssignee.isPending ? 'Menambah...' : 'Tambah petugas'}</button></div>
      {!!assignees.data?.length && <div className="assignee-list" aria-label="Daftar petugas"><div className="assignee-list-heading"><div><p className="eyebrow">PETUGAS TERSIMPAN</p><h3>Siapa saja yang bisa bertugas?</h3></div><span className="count-badge">{assignees.data.length} orang</span></div><div className="assignee-list-items">{assignees.data.map((assignee) => <div className="assignee-row" key={assignee.id}><span className="assignee-avatar" aria-hidden="true">{assignee.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{assignee.display_name}</strong><small>{selectedHasAssignee(days, assignee.id) ? 'Dipakai di rotasi mingguan' : 'Belum dipakai di rotasi'}</small></div><div className="assignee-row-actions"><button className="ghost-button" type="button" onClick={() => editAssignee(assignee.id, assignee.display_name)}>Edit</button><button className="danger-button" type="button" disabled={archiveAssignee.isPending} onClick={() => setPendingDelete({ id: assignee.id, displayName: assignee.display_name })}>Hapus</button></div></div>)}</div></div>}
      <div className="rotation-date-grid"><label>Mulai<DateInput value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Sampai<DateInput value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
      <p className="rotation-help"><strong>Sinkron dengan Jadwal</strong><span>Petugas disimpan sebagai snapshot pada setiap tugas. Mengubah rotasi tidak mengubah tugas yang sudah selesai atau histori lama.</span></p>
      <div className="rotation-day-grid">{weekdays.map((day) => <label key={day.value}>{day.label}<select value={selected.get(day.value) ?? ''} onChange={(event) => setDay(day.value, event.target.value)}><option value="">Belum ditugaskan</option>{(assignees.data ?? []).map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.display_name}</option>)}</select></label>)}</div>
      {!assignees.data?.length && <p className="field-hint">Tambahkan minimal satu nama petugas untuk mengatur rotasi.</p>}
      {(save.error || saveAssignee.error || archiveAssignee.error) && <p className="notice" role="alert">{(save.error ?? saveAssignee.error ?? archiveAssignee.error)?.message}</p>}
      <button className="primary" type="button" disabled={save.isPending || !assignees.data?.length} onClick={() => save.mutate({ startDate, endDate, days })}>{save.isPending ? 'Menyimpan...' : 'Simpan rotasi'}</button>
    </QueryState>
    <ConfirmDialog open={Boolean(pendingDelete)} title="Hapus petugas?" description={`${pendingDelete?.displayName ?? 'Petugas'} akan dihapus dari daftar pilihan baru. Histori tugas yang sudah tercatat tetap aman.`} confirmLabel="Hapus petugas" destructive pending={archiveAssignee.isPending} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (!pendingDelete) return; archiveAssignee.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) }); }} />
    {editingAssignee && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saveAssignee.isPending) cancelEdit(); }}><section className="panel assignee-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="assignee-edit-title"><div className="assignee-edit-heading"><div><p className="eyebrow">EDIT PETUGAS</p><h2 id="assignee-edit-title">Ubah nama petugas</h2></div><button className="icon-button" type="button" aria-label="Tutup edit petugas" onClick={cancelEdit} disabled={saveAssignee.isPending}>×</button></div><label>Nama petugas<input autoFocus maxLength={120} value={editingAssignee.displayName} onChange={(event) => setEditingAssignee({ ...editingAssignee, displayName: event.target.value })} /></label><p className="field-hint">Perubahan nama akan dipakai untuk penugasan baru. Histori lama tetap menyimpan snapshot sebelumnya.</p><div className="dialog-actions"><button className="secondary" type="button" onClick={cancelEdit} disabled={saveAssignee.isPending}>Batal</button><button className="primary" type="button" onClick={saveEditedAssignee} disabled={saveAssignee.isPending || !editingAssignee.displayName.trim()}>{saveAssignee.isPending ? 'Menyimpan...' : 'Simpan perubahan'}</button></div></section></div>}
  </section>;
}
