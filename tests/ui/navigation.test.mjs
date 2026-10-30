import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("responsive shell owns all ten Indonesian navigation entries", () => {
  const source = read("src/components/AppShell.tsx");
  for (const label of [
    "Dashboard",
    "Jadwal",
    "Katalog",
    "Kucing",
    "Litter Box",
    "Histori",
    "Laporan",
    "Pengaturan Jadwal",
    "Pengguna",
    "Database",
    "Pengaturan",
  ]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /aria-label/);
  assert.match(source, /nav-parent/);
  assert.match(source, /Tambah jadwal/);
  assert.match(source, /Jadwal saya/);
  assert.match(source, /aria-controls="schedule-submenu"/);
  assert.match(source, /Keluar/);
  assert.match(read("src/styles.css"), /max-width:760px/);
});

test("mobile schedule shortcut opens operational schedule history", () => {
  const source = read("src/components/AppShell.tsx");
  assert.match(source, /key: "Riwayat Jadwal", Icon: Clock3/);
  assert.match(source, /"Riwayat Jadwal": "\/app\/riwayat-jadwal"/);
  assert.match(source, /activePage === key/);
});

test("mobile schedule configuration actions use a two-column card grid", () => {
  const css = read("src/layout-system.css");
  assert.match(css, /\.schedule-responsive-list \.schedule-list-row\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.schedule-responsive-list \.schedule-list-row > \.row-actions\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test("app shell delegates controlled search to database-backed global search", () => {
  const source =
    read("src/components/AppShell.tsx") +
    read("src/components/GlobalSearch.tsx");
  assert.match(source, /<input[^>]+value=\{query\}/);
  assert.match(
    source,
    /onChange=\{\(event\) => \{ setQuery\(event\.target\.value\)/,
  );
  assert.match(source, /<Search[^>]+aria-hidden/);
  assert.match(source, /GlobalSearch/);
  assert.match(source, /onNavigate\(result\.page\)/);
});

test("shell uses stable icon and label sizing without emoji decoration", () => {
  const source = read("src/components/AppShell.tsx");
  const styles = read("src/styles.css");
  assert.match(source, /nav-icon/);
  assert.match(source, /nav-label-text/);
  assert.doesNotMatch(source, /[\u{1F300}-\u{1FAFF}]/u);
  assert.doesNotMatch(styles, /cat-art|promo-cat|font-size:120px/);
  assert.match(styles, /\.nav-icon\{[^}]*width:22px/);
  assert.match(styles, /\.nav-label-text\{[^}]*flex:1/);
});

test("navigation optical alignment locks icon box and label baseline", () => {
  const css = read("src/brief-overrides.css");
  assert.match(css, /\.nav-item\s*\{[^}]*align-items:\s*center/s);
  assert.match(css, /\.nav-icon\s*\{[^}]*flex:\s*0\s+0\s+22px/s);
  assert.match(css, /\.nav-label-text\s*\{[^}]*line-height:\s*1\.25/s);
});

test("cats navigation is a direct destination while schedule owns the dropdown", () => {
  const source = read("src/components/AppShell.tsx");
  assert.match(source, /id="schedule-submenu"/);
  assert.doesNotMatch(source, /Profil kucing/);
  assert.doesNotMatch(source, /openCatCare/);
  assert.match(source, /Kucing: "\/app\/kucing"/);
});

test("responsive management layouts define mobile-safe grids and controls", () => {
  const styles =
    read("src/styles.css") +
    read("src/management.css") +
    read("src/report.css");
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
  assert.match(styles, /min-width:\s*0/);
  assert.match(styles, /overflow-x:\s*auto/);
});

test("shared query state has accessible loading, empty, and error variants", () => {
  const source = read("src/components/QueryState.tsx");
  assert.match(source, /Memuat/);
  assert.match(source, /Belum ada data/);
  assert.match(source, /role="alert"/);
});
