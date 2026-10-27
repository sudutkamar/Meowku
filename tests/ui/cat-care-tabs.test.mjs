import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/features/cats/CatCarePanel.tsx", "utf8");

test("cat care detail exposes a database-backed summary tab before domain tabs", () => {
  assert.match(
    source,
    /type CareTab = ["']summary["'] \| ["']health["'] \| ["']food["'] \| ["']expense["']/,
  );
  assert.match(source, /label: ["']Ringkasan["']/);
  assert.match(source, /tab === ["']summary["']/);
  assert.match(source, /useCatExpenses/);
  assert.match(source, /useCatFoodProfiles/);
});

test("food and expense remain separate panel modes for reusable flows", () => {
  assert.match(source, /tab === ["']food["']/);
  assert.match(source, /mode="food"/);
});

test("food and expense panel renders each domain structurally by mode", () => {
  const panel = fs.readFileSync(
    "src/features/cats/CatFoodExpensePanel.tsx",
    "utf8",
  );
  assert.match(panel, /const showFood = mode !== "expense"/);
  assert.match(panel, /const showExpense = mode !== "food"/);
  assert.match(panel, /showFood &&/);
  assert.match(panel, /showExpense &&/);
});

test("tab isolation does not depend on child position CSS", () => {
  const css = fs.readFileSync("src/cat-care-tabs.css", "utf8");
  assert.doesNotMatch(css, /cat-food-expense-grid[^}]*nth-child/);
});

test("cat detail uses a compact care workspace header", () => {
  const page = fs.readFileSync("src/features/cats/CatsPage.tsx", "utf8");
  assert.match(page, /cat-detail-hero/);
  assert.match(page, /cat-detail-meta/);
  assert.match(page, /Edit profil/);
});

test("cat care exposes the workspace tabs including expenses", () => {
  assert.match(source, /label: ["']Ringkasan["']/);
  assert.match(source, /label: ["']Kesehatan & vaksin["']/);
  assert.match(source, /label: ["']Makanan["']/);
  assert.match(source, /label: ["']Pengeluaran["']/);
  assert.match(source, /tab === ["']expense["']/);
});
