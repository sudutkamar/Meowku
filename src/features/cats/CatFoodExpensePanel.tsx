import { useEffect, useRef, useState } from "react";
import { Banknote, Camera, ScanBarcode, Utensils } from "lucide-react";
import { QueryState } from "../../components/QueryState";
import { DateInput } from "../../components/DateInput";
import {
  useAssignFoodToCat,
  useCatExpenses,
  useCatFoodProfiles,
  useCatFoodProducts,
  useCreateCatExpense,
  useCreateFoodProduct,
  useConfirmCatScan,
  useCreateCatScanRecord,
  useScanFood,
  useUploadCatAttachment,
} from "./useCatCare";

export function CatFoodExpensePanel({
  householdId,
  catId,
  mode = "all",
}: {
  householdId: string;
  catId?: string;
  mode?: "all" | "food" | "expense";
}) {
  const foods = useCatFoodProducts(householdId);
  const activeFoods = useCatFoodProfiles(householdId, catId);
  const expenses = useCatExpenses(householdId, catId);
  const createFood = useCreateFoodProduct(householdId);
  const createScan = useCreateCatScanRecord(householdId, catId);
  const confirmScanRecord = useConfirmCatScan(householdId);
  const scanFood = useScanFood(householdId, catId);
  const assignFood = useAssignFoodToCat(householdId, catId);
  const createExpense = useCreateCatExpense(householdId, catId);
  const [food, setFood] = useState({
    brand: "",
    product_name: "",
    variant: "",
    barcode: "",
    food_type: "dry" as "dry" | "wet" | "treat" | "supplement" | "other",
    life_stage: "all_life_stages" as
      "kitten" | "adult" | "senior" | "all_life_stages",
    kcal_per_100g: "",
    moisture_percent: "",
    protein_percent: "",
    fat_percent: "",
    fiber_percent: "",
  });
  const [assignment, setAssignment] = useState({
    food_product_id: "",
    serving_amount: "",
    serving_unit: "gram" as "gram" | "ml" | "piece" | "sachet" | "can",
    feeding_frequency: "",
    daily_kcal_target: "",
    treat_percent: "",
    water_ml_target: "",
    started_at: new Date().toISOString().slice(0, 10),
  });
  const [expense, setExpense] = useState({
    category: "food" as
      | "food"
      | "medicine"
      | "veterinary"
      | "vaccination"
      | "grooming"
      | "litter"
      | "other",
    amount: "",
    merchant: "",
    spent_at: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [scanDraft, setScanDraft] = useState<ReturnType<typeof useScanFood>["data"]>(undefined);
  const [scanRecordId, setScanRecordId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadExpense = useUploadCatAttachment(householdId, catId, "expense");
  const showFood = mode !== "expense";
  const showExpense = mode !== "food";
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  function foodPayload() { return { ...food, kcal_per_100g: food.kcal_per_100g ? Number(food.kcal_per_100g) : undefined, moisture_percent: food.moisture_percent ? Number(food.moisture_percent) : undefined, protein_percent: food.protein_percent ? Number(food.protein_percent) : undefined, fat_percent: food.fat_percent ? Number(food.fat_percent) : undefined, fiber_percent: food.fiber_percent ? Number(food.fiber_percent) : undefined }; }
  async function startBarcodeScan() {
    setScanError(null);
    const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: new (options?: { formats: string[] }) => { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!BarcodeDetectorClass) { setScanError("Scanner barcode belum didukung browser ini. Masukkan barcode manual atau gunakan foto label."); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setScanError("Kamera tidak tersedia. Gunakan foto label atau masukkan barcode manual."); return; }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      setScanning(true);
      const detector = new BarcodeDetectorClass({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      while (streamRef.current) {
        const matches = await detector.detect(videoRef.current);
        if (matches[0]?.rawValue) { const result = await scanFood.mutateAsync({ barcode: matches[0].rawValue }); const record = await createScan.mutateAsync({ scan_type: "food_label", barcode: result.barcode ?? matches[0].rawValue, extracted_data: result }); setScanRecordId(record.id); setScanDraft(result); setFood((current) => ({ ...current, brand: result.brand, product_name: result.product_name, variant: result.variant ?? "", barcode: result.barcode ?? matches[0].rawValue, food_type: result.food_type })); break; }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (error) { setScanError(error instanceof Error ? error.message : "Kamera atau barcode tidak bisa dipakai."); }
    finally { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setScanning(false); }
  }
  async function scanLabel(file: File) {
    setScanError(null);
    try { const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("Foto label tidak bisa dibaca.")); reader.readAsDataURL(file); }); const result = await scanFood.mutateAsync({ imageBase64: base64 }); const record = await createScan.mutateAsync({ scan_type: "food_label", extracted_data: result }); setScanRecordId(record.id); setScanDraft(result); setFood((current) => ({ ...current, brand: result.brand, product_name: result.product_name, variant: result.variant ?? "", barcode: result.barcode ?? "", food_type: result.food_type })); } catch (error) { setScanError(error instanceof Error ? error.message : "Foto label gagal diproses."); }
  }
  function confirmScan() { if (!scanDraft) return; createFood.mutate({ ...foodPayload(), source: scanDraft.source }, { onSuccess: () => { if (scanRecordId) confirmScanRecord.mutate({ id: scanRecordId, extractedData: scanDraft }); setScanDraft(undefined); setScanRecordId(null); } }); }
  return (
    <section className="cat-care-grid cat-food-expense-grid">
      {showFood && (
        <section className="panel cat-care-card">
          <div className="section-heading">
            <h3>
              <Utensils size={18} /> Makanan
            </h3>
          </div>
          <div className="food-scan-actions">
            <div><strong>Isi dari kemasan</strong><small>Cek dulu hasil scan sebelum disimpan.</small></div>
            <div className="food-scan-buttons"><button className="secondary" type="button" onClick={() => void startBarcodeScan()} disabled={scanning || scanFood.isPending}><ScanBarcode size={16} /> {scanning ? "Mencari barcode..." : "Scan barcode"}</button><label className="secondary food-scan-upload"><Camera size={16} /> Foto label<input type="file" accept="image/jpeg,image/png" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanLabel(file); event.currentTarget.value = ""; }} /></label></div>
            <video ref={videoRef} className={`food-scan-video${scanning ? " visible" : ""}`} muted playsInline aria-label="Pratinjau kamera barcode" />
            {scanError && <p className="notice" role="alert">{scanError}</p>}
          </div>
          <form
            className="cat-care-form"
            onSubmit={(event) => {
              event.preventDefault();
              createFood.mutate(foodPayload(), {
                onSuccess: () =>
                  setFood({
                    ...food,
                    brand: "",
                    product_name: "",
                    variant: "",
                    barcode: "",
                  }),
              });
            }}
          >
            <div className="cat-care-form-row">
              <label>
                Brand
                <input
                  value={food.brand}
                  onChange={(event) =>
                    setFood({ ...food, brand: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Nama produk
                <input
                  value={food.product_name}
                  onChange={(event) =>
                    setFood({ ...food, product_name: event.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className="cat-care-form-row">
              <label>
                Jenis
                <select
                  value={food.food_type}
                  onChange={(event) =>
                    setFood({
                      ...food,
                      food_type: event.target.value as typeof food.food_type,
                    })
                  }
                >
                  <option value="dry">Dry food</option>
                  <option value="wet">Wet food</option>
                  <option value="treat">Snack</option>
                  <option value="supplement">Suplemen</option>
                  <option value="other">Lainnya</option>
                </select>
              </label>
              <label>
                Barcode
                <input
                  value={food.barcode}
                  onChange={(event) =>
                    setFood({ ...food, barcode: event.target.value })
                  }
                  placeholder="Opsional"
                />
              </label>
            </div>
            <div className="cat-care-form-row">
              <label>Energi (kcal/100 g)<input type="number" min="0" step="0.01" value={food.kcal_per_100g} onChange={(event) => setFood({ ...food, kcal_per_100g: event.target.value })} placeholder="Dari label makanan" /></label>
              <label>Protein (%)<input type="number" min="0" max="100" step="0.1" value={food.protein_percent} onChange={(event) => setFood({ ...food, protein_percent: event.target.value })} placeholder="Opsional" /></label>
            </div>
            <div className="cat-care-form-row">
              <label>Lemak (%)<input type="number" min="0" max="100" step="0.1" value={food.fat_percent} onChange={(event) => setFood({ ...food, fat_percent: event.target.value })} placeholder="Opsional" /></label>
              <label>Serat (%)<input type="number" min="0" max="100" step="0.1" value={food.fiber_percent} onChange={(event) => setFood({ ...food, fiber_percent: event.target.value })} placeholder="Opsional" /></label>
            </div>
            {scanDraft && <div className="food-scan-draft"><div><strong>Cek hasil scan</strong><small>{scanDraft.source === "barcode" ? "Dari barcode" : "Dari foto label"} · belum disimpan</small></div><button className="primary" type="button" onClick={confirmScan} disabled={createFood.isPending}>Konfirmasi dan simpan</button></div>}
            <button
              className="secondary"
              type="submit"
              disabled={createFood.isPending}
            >
              Tambah makanan
            </button>
            {createFood.error && (
              <p className="notice" role="alert">
                {createFood.error.message}
              </p>
            )}
          </form>
          <form
            className="cat-care-form"
            onSubmit={(event) => {
              event.preventDefault();
              assignFood.mutate({
                food_product_id: assignment.food_product_id,
                serving_amount: assignment.serving_amount
                  ? Number(assignment.serving_amount)
                  : undefined,
                serving_unit: assignment.serving_unit,
                feeding_frequency: assignment.feeding_frequency || undefined,
                daily_kcal_target: assignment.daily_kcal_target ? Number(assignment.daily_kcal_target) : undefined,
                treat_percent: assignment.treat_percent ? Number(assignment.treat_percent) : undefined,
                water_ml_target: assignment.water_ml_target ? Number(assignment.water_ml_target) : undefined,
                started_at: assignment.started_at,
              });
            }}
          >
            <label>
              Pasangkan makanan ke kucing
              <select
                value={assignment.food_product_id}
                onChange={(event) =>
                  setAssignment({
                    ...assignment,
                    food_product_id: event.target.value,
                  })
                }
                required
              >
                <option value="">Pilih produk</option>
                {foods.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.brand} · {item.product_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="cat-care-form-row">
              <label>
                Takaran
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={assignment.serving_amount}
                  onChange={(event) =>
                    setAssignment({
                      ...assignment,
                      serving_amount: event.target.value,
                    })
                  }
                  placeholder="Opsional"
                />
              </label>
              <label>
                Satuan
                <select
                  value={assignment.serving_unit}
                  onChange={(event) =>
                    setAssignment({
                      ...assignment,
                      serving_unit: event.target
                        .value as typeof assignment.serving_unit,
                    })
                  }
                >
                  <option value="gram">Gram</option>
                  <option value="ml">ml</option>
                  <option value="piece">Potong</option>
                  <option value="sachet">Sachet</option>
                  <option value="can">Kaleng</option>
                </select>
              </label>
            </div>
            <div className="cat-care-form-row">
              <label>Target energi/hari (kcal)<input type="number" min="1" step="0.1" value={assignment.daily_kcal_target} onChange={(event) => setAssignment({ ...assignment, daily_kcal_target: event.target.value })} placeholder="Diisi bersama dokter hewan" /></label>
              <label>Batas treat (%)<input type="number" min="0" max="100" step="1" value={assignment.treat_percent} onChange={(event) => setAssignment({ ...assignment, treat_percent: event.target.value })} placeholder="Opsional" /></label>
            </div>
            <label>Target air/hari (ml)<input type="number" min="1" step="1" value={assignment.water_ml_target} onChange={(event) => setAssignment({ ...assignment, water_ml_target: event.target.value })} placeholder="Opsional" /></label>
            <button
              className="primary"
              type="submit"
              disabled={assignFood.isPending || !catId}
            >
              Simpan makanan
            </button>
            {assignFood.error && (
              <p className="notice" role="alert">
                {assignFood.error.message}
              </p>
            )}
          </form>
          <QueryState
            loading={activeFoods.isLoading}
            error={activeFoods.error}
            empty={
              !activeFoods.isLoading &&
              !activeFoods.error &&
              !activeFoods.data?.length
            }
          >
            <div className="cat-care-list">
              {activeFoods.data?.map((item) => (
                <article className="cat-care-item" key={item.id}>
                  <div>
                    <b>
                      {item.food_products?.brand} ·{" "}
                      {item.food_products?.product_name}
                    </b>
                    <small>
                      {item.serving_amount
                        ? `${item.serving_amount} ${item.serving_unit ?? ""}`
                        : "Takaran belum diisi"}
                      {item.daily_kcal_target ? ` · target ${item.daily_kcal_target} kcal/hari` : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </QueryState>
        </section>
      )}
      {showExpense && (
        <section className="panel cat-care-card">
          <div className="section-heading">
            <h3>
              <Banknote size={18} /> Pengeluaran
            </h3>
          </div>
          <form
            className="cat-care-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const attachment = expenseFile
                ? await uploadExpense.mutateAsync(expenseFile)
                : null;
              createExpense.mutate({
                category: expense.category,
                amount: Number(expense.amount),
                merchant: expense.merchant || undefined,
                spent_at: expense.spent_at,
                notes: expense.notes || undefined,
                attachment_id: attachment?.id,
              });
            }}
          >
            <div className="cat-care-form-row">
              <label>
                Kategori
                <select
                  value={expense.category}
                  onChange={(event) =>
                    setExpense({
                      ...expense,
                      category: event.target.value as typeof expense.category,
                    })
                  }
                >
                  <option value="food">Makanan</option>
                  <option value="medicine">Obat</option>
                  <option value="veterinary">Dokter hewan</option>
                  <option value="vaccination">Vaksin</option>
                  <option value="grooming">Grooming</option>
                  <option value="litter">Litter</option>
                  <option value="other">Lainnya</option>
                </select>
              </label>
              <label>
                Nominal (IDR)
                <input
                  type="number"
                  min="1"
                  value={expense.amount}
                  onChange={(event) =>
                    setExpense({ ...expense, amount: event.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className="cat-care-form-row">
              <label>
                Tanggal
                <DateInput
                  value={expense.spent_at}
                  onChange={(event) =>
                    setExpense({ ...expense, spent_at: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Merchant
                <input
                  value={expense.merchant}
                  onChange={(event) =>
                    setExpense({ ...expense, merchant: event.target.value })
                  }
                  placeholder="Opsional"
                />
              </label>
            </div>
            <label>
              Catatan
              <textarea
                value={expense.notes}
                onChange={(event) =>
                  setExpense({ ...expense, notes: event.target.value })
                }
                rows={2}
                placeholder="Opsional"
              />
            </label>
            <label>
              Bukti pembayaran
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(event) =>
                  setExpenseFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <button
              className="primary"
              type="submit"
              disabled={
                createExpense.isPending || uploadExpense.isPending || !catId
              }
            >
              {createExpense.isPending || uploadExpense.isPending
                ? "Mengunggah..."
                : "Catat pengeluaran"}
            </button>
            {createExpense.error && (
              <p className="notice" role="alert">
                {createExpense.error.message}
              </p>
            )}
            {uploadExpense.error && (
              <p className="notice" role="alert">
                {uploadExpense.error.message}
              </p>
            )}
          </form>
          <QueryState
            loading={expenses.isLoading}
            error={expenses.error}
            empty={
              !expenses.isLoading && !expenses.error && !expenses.data?.length
            }
          >
            <div className="cat-care-list">
              {expenses.data?.map((item) => (
                <article className="cat-care-item" key={item.id}>
                  <div>
                    <b>{item.category}</b>
                    <small>
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(item.amount)}{" "}
                      · {new Date(item.spent_at).toLocaleDateString("id-ID")}
                    </small>
                    {item.merchant && <p>{item.merchant}</p>}
                  </div>
                </article>
              ))}
            </div>
          </QueryState>
        </section>
      )}
    </section>
  );
}
