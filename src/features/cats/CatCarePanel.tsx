import { useEffect, useState } from "react";
import { CalendarClock, HeartPulse, Syringe } from "lucide-react";
import type { Database } from "../../lib/database.types";
import { QueryState } from "../../components/QueryState";
import { DateInput } from "../../components/DateInput";
import {
  useCatExpenses,
  useCatFoodProfiles,
  useCatHealthRecords,
  useCatVaccinations,
  useCreateCatHealthRecord,
  useCreateCatVaccination,
  useUploadCatAttachment,
} from "./useCatCare";
import { CatFoodExpensePanel } from "./CatFoodExpensePanel";
import "../../cat-care-tabs.css";

type Cat = Database["public"]["Tables"]["cats"]["Row"];
type CareTab = "summary" | "health" | "food" | "expense";
const today = (timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());

export function CatCarePanel({
  householdId,
  timezone = "Asia/Jakarta",
  cats,
  initialTab = "summary",
  onTabChange,
}: {
  householdId: string;
  timezone?: string;
  cats: Cat[];
  initialTab?: CareTab;
  onTabChange?: (tab: CareTab) => void;
}) {
  const catId = cats[0]?.id ?? "";
  const [tab, setTab] = useState<CareTab>(initialTab);
  const [healthForm, setHealthForm] = useState({
    record_type: "note" as
      "checkup" | "symptom" | "medication" | "weight" | "note",
    title: "",
    notes: "",
    weight_kg: "",
    recorded_at: today(timezone),
  });
  const [vaccineForm, setVaccineForm] = useState({
    vaccine_name: "",
    dose_number: "1",
    administered_at: today(timezone),
    next_due_at: "",
    clinic_name: "",
    notes: "",
  });
  const [healthAttachment, setHealthAttachment] = useState<File | null>(null);
  const [vaccineAttachment, setVaccineAttachment] = useState<File | null>(null);
  const health = useCatHealthRecords(householdId, catId);
  const vaccinations = useCatVaccinations(householdId, catId);
  const activeFoods = useCatFoodProfiles(householdId, catId);
  const expenses = useCatExpenses(householdId, catId);
  const createHealth = useCreateCatHealthRecord(householdId, catId);
  const createVaccine = useCreateCatVaccination(householdId, catId);
  const uploadHealth = useUploadCatAttachment(householdId, catId, "health");
  const uploadVaccination = useUploadCatAttachment(householdId, catId, "vaccination");
  useEffect(() => setTab(initialTab), [initialTab]);
  if (!cats.length)
    return (
      <section className="cat-care-section">
        <div className="panel cat-care-empty">
          <HeartPulse size={24} />
          <div>
            <p className="eyebrow">PERAWATAN KUCING</p>
            <h2>Belum ada kucing</h2>
            <p>
              Tambah kucing dulu untuk mencatat kesehatan, makanan, dan biaya.
            </p>
          </div>
        </div>
      </section>
    );

  const selectedCat = cats.find((cat) => cat.id === catId);
  const latestWeight = health.data?.find((record) => record.weight_kg !== null && record.weight_kg !== undefined);
  const nextVaccine = (vaccinations.data ?? []).filter((record) => record.next_due_at).sort((a, b) => String(a.next_due_at).localeCompare(String(b.next_due_at)))[0];
  const tabs = [
    { value: "summary" as const, label: "Ringkasan" },
    { value: "health" as const, label: "Kesehatan & vaksin" },
    { value: "food" as const, label: "Makanan" },
    { value: "expense" as const, label: "Pengeluaran" },
  ];
  return (
    <section className="cat-care-section">
      <div className="cat-care-heading">
        <div>
          <p className="eyebrow">PERAWATAN KUCING</p>
          <h2>{selectedCat?.name}</h2>
          <p className="field-hint">
            Atur perawatan, makanan, dan biaya di sini.
          </p>
        </div>
      </div>
      {tab === "summary" && (
        <div className="cat-care-summary" role="tabpanel">
          <article className="panel cat-summary-card">
            <span>Catatan kesehatan</span>
            <strong>{health.data?.length ?? 0}</strong>
            <small>catatan tersimpan</small>
          </article>
          <article className="panel cat-summary-card">
            <span>Vaksin tercatat</span>
            <strong>{vaccinations.data?.length ?? 0}</strong>
            <small>termasuk booster</small>
          </article>
          <article className="panel cat-summary-card">
            <span>Makanan aktif</span>
            <strong>{activeFoods.data?.length ?? 0}</strong>
            <small>produk aktif</small>
          </article>
          <article className="panel cat-summary-card">
            <span>Pengeluaran tercatat</span>
            <strong>{expenses.data?.length ?? 0}</strong>
            <small>catatan biaya</small>
          </article>
          <article className="panel cat-summary-card">
            <span>Berat terbaru</span>
            <strong>{latestWeight?.weight_kg ? `${latestWeight.weight_kg} kg` : "—"}</strong>
            <small>{latestWeight ? new Date(latestWeight.recorded_at).toLocaleDateString("id-ID", { timeZone: timezone }) : "Belum dicatat"}</small>
          </article>
          <div className="panel cat-summary-next">
            <div>
              <p className="eyebrow">PERLU PERHATIAN</p>
              <h3>{nextVaccine ? "Vaksin berikutnya" : "Perawatan terbaru"}</h3>
              <p>
                {nextVaccine
                  ? `${nextVaccine.vaccine_name} · ${new Date(`${nextVaccine.next_due_at}T12:00:00Z`).toLocaleDateString("id-ID", { timeZone: timezone })}`
                  : health.data?.[0]
                  ? `${health.data[0].title} · ${new Date(health.data[0].recorded_at).toLocaleDateString("id-ID")}`
                  : "Belum ada catatan kesehatan."}
              </p>
            </div><CalendarClock size={28} aria-hidden="true" />
              <button type="button" className="secondary" onClick={() => setTab("health")}>
              Lihat kesehatan
            </button>
          </div>
        </div>
      )}
      <div
        className="cat-care-tabs"
        role="tablist"
        aria-label="Menu perawatan kucing"
      >
        {tabs.map((item) => (
          <button
            type="button"
            key={item.value}
            className={tab === item.value ? "active" : ""}
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => { setTab(item.value); onTabChange?.(item.value); }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "health" && (
        <div className="cat-care-grid" role="tabpanel">
          <section className="panel cat-care-card">
            <div className="section-heading">
              <h3>
                <HeartPulse size={18} /> Riwayat kesehatan
              </h3>
              <span className="count-badge">{health.data?.length ?? 0}</span>
            </div>
            <form
              className="cat-care-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const attachment = healthAttachment ? await uploadHealth.mutateAsync(healthAttachment) : null;
                createHealth.mutate(
                  {
                    record_type: healthForm.record_type,
                    title: healthForm.title,
                    notes: healthForm.notes || undefined,
                    weight_kg: healthForm.weight_kg
                      ? Number(healthForm.weight_kg)
                      : undefined,
                    recorded_at: `${healthForm.recorded_at}T12:00:00Z`,
                    attachment_id: attachment?.id,
                  },
                  {
                    onSuccess: () => {
                      setHealthForm({
                        ...healthForm,
                        title: "",
                        notes: "",
                        weight_kg: "",
                      });
                      setHealthAttachment(null);
                    },
                  },
                );
              }}
            >
              <div className="cat-care-form-row">
                <label>
                  Jenis
                  <select
                    value={healthForm.record_type}
                    onChange={(event) =>
                      setHealthForm({
                        ...healthForm,
                        record_type: event.target
                          .value as typeof healthForm.record_type,
                      })
                    }
                  >
                    <option value="note">Catatan</option>
                    <option value="checkup">Pemeriksaan</option>
                    <option value="symptom">Gejala</option>
                    <option value="medication">Obat</option>
                    <option value="weight">Berat badan</option>
                  </select>
                </label>
                <label>
                  Tanggal
                  <DateInput
                    value={healthForm.recorded_at}
                    onChange={(event) =>
                      setHealthForm({
                        ...healthForm,
                        recorded_at: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              </div>
              <label>
                Judul
                <input
                  value={healthForm.title}
                  onChange={(event) =>
                    setHealthForm({ ...healthForm, title: event.target.value })
                  }
                  placeholder="Contoh: pemeriksaan rutin"
                  required
                  maxLength={160}
                />
              </label>
              <div className="cat-care-form-row">
                <label>
                  Berat (kg)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={healthForm.weight_kg}
                    onChange={(event) =>
                      setHealthForm({
                        ...healthForm,
                        weight_kg: event.target.value,
                      })
                    }
                    placeholder="Opsional"
                  />
                </label>
                <label>
                  Catatan
                  <textarea
                    value={healthForm.notes}
                    onChange={(event) =>
                      setHealthForm({
                        ...healthForm,
                        notes: event.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Detail tambahan"
                  />
                </label>
              </div>
              <label>
                Bukti kesehatan
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setHealthAttachment(event.target.files?.[0] ?? null)} />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={createHealth.isPending || uploadHealth.isPending}
              >
                {createHealth.isPending ? "Menyimpan..." : "Tambah catatan"}
              </button>
              {createHealth.error && (
                <p className="notice" role="alert">
                  {createHealth.error.message}
                </p>
              )}
            </form>
            <QueryState
              loading={health.isLoading}
              error={health.error}
              empty={!health.isLoading && !health.error && !health.data?.length}
            >
              <div className="cat-care-list">
                {health.data?.map((record) => (
                  <article className="cat-care-item" key={record.id}>
                    <div>
                      <b>{record.title}</b>
                      <small>
                        {record.record_type} ·{" "}
                        {new Date(record.recorded_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </small>
                      {record.notes && <p>{record.notes}</p>}
                    </div>
                    {record.weight_kg && <strong>{record.weight_kg} kg</strong>}
                  </article>
                ))}
              </div>
            </QueryState>
          </section>
          <section className="panel cat-care-card">
            <div className="section-heading">
              <h3>
                <Syringe size={18} /> Vaksin
              </h3>
              <span className="count-badge">
                {vaccinations.data?.length ?? 0}
              </span>
            </div>
            <form
              className="cat-care-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const attachment = vaccineAttachment ? await uploadVaccination.mutateAsync(vaccineAttachment) : null;
                createVaccine.mutate(
                  {
                    vaccine_name: vaccineForm.vaccine_name,
                    dose_number: Number(vaccineForm.dose_number),
                    administered_at: vaccineForm.administered_at,
                    next_due_at: vaccineForm.next_due_at || undefined,
                    clinic_name: vaccineForm.clinic_name || undefined,
                    notes: vaccineForm.notes || undefined,
                    attachment_id: attachment?.id,
                  },
                  {
                    onSuccess: () => {
                      setVaccineForm({
                        ...vaccineForm,
                        vaccine_name: "",
                        clinic_name: "",
                        notes: "",
                        next_due_at: "",
                      }),
                      setVaccineAttachment(null);
                    },
                  },
                );
              }}
            >
              <div className="cat-care-form-row">
                <label>
                  Nama vaksin
                  <input
                    value={vaccineForm.vaccine_name}
                    onChange={(event) =>
                      setVaccineForm({
                        ...vaccineForm,
                        vaccine_name: event.target.value,
                      })
                    }
                    placeholder="Contoh: F3"
                    required
                  />
                </label>
                <label>
                  Dosis ke
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={vaccineForm.dose_number}
                    onChange={(event) =>
                      setVaccineForm({
                        ...vaccineForm,
                        dose_number: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              </div>
              <div className="cat-care-form-row">
                <label>
                  Diberikan
                  <DateInput
                    value={vaccineForm.administered_at}
                    onChange={(event) =>
                      setVaccineForm({
                        ...vaccineForm,
                        administered_at: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Booster berikutnya
                  <DateInput
                    value={vaccineForm.next_due_at}
                    onChange={(event) =>
                      setVaccineForm({
                        ...vaccineForm,
                        next_due_at: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Bukti vaksin
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setVaccineAttachment(event.target.files?.[0] ?? null)} />
              </label>
              <label>
                Klinik/dokter
                <input
                  value={vaccineForm.clinic_name}
                  onChange={(event) =>
                    setVaccineForm({
                      ...vaccineForm,
                      clinic_name: event.target.value,
                    })
                  }
                  placeholder="Opsional"
                />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={createVaccine.isPending || uploadVaccination.isPending}
              >
                {createVaccine.isPending ? "Menyimpan..." : "Tambah vaksin"}
              </button>
              {createVaccine.error && (
                <p className="notice" role="alert">
                  {createVaccine.error.message}
                </p>
              )}
            </form>
            <QueryState
              loading={vaccinations.isLoading}
              error={vaccinations.error}
              empty={
                !vaccinations.isLoading &&
                !vaccinations.error &&
                !vaccinations.data?.length
              }
            >
              <div className="cat-care-list">
                {vaccinations.data?.map((vaccine) => (
                  <article className="cat-care-item" key={vaccine.id}>
                    <div>
                      <b>{vaccine.vaccine_name}</b>
                      <small>
                        Dosis {vaccine.dose_number} ·{" "}
                        {new Date(vaccine.administered_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </small>
                    </div>
                    {vaccine.next_due_at && (
                      <strong>
                        Booster{" "}
                        {new Date(vaccine.next_due_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </strong>
                    )}
                  </article>
                ))}
              </div>
            </QueryState>
          </section>
        </div>
      )}
      {tab === "food" && (
        <div className="cat-care-mode-food" role="tabpanel">
          <CatFoodExpensePanel
            householdId={householdId}
            catId={catId}
            mode="food"
          />
        </div>
      )}
      {tab === "expense" && (
        <div className="cat-care-mode-expense" role="tabpanel">
          <CatFoodExpensePanel householdId={householdId} catId={catId} mode="expense" />
        </div>
      )}
    </section>
  );
}
