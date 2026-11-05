import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { filterProducts } from "../src/model.js";
import { resolveRoute, SCREEN_GROUPS } from "../src/routes.js";
const original = JSON.parse(
  readFileSync(new URL("../src/data/products.json", import.meta.url)),
);
const he = JSON.parse(
  readFileSync(new URL("../src/data/he-products.json", import.meta.url)),
);
test("HE prices preserve conversion and include the additional 5% catalog adjustment", () => {
  assert.deepEqual(
    he.map((p) => p.price),
    [18158.31, 19410.6, 24419.8, 21289.05],
  );
  for (const p of he) {
    assert.equal(p.brand, "HE");
    assert.equal(p.availability, "order");
    assert.equal(p.pricing.date, "2026-10-30");
    for (const image of p.gallery)
      assert.ok(existsSync(new URL("../public" + image, import.meta.url)));
  }
});
test("HE is first for every order mode and price order is retained inside each group", () => {
  const all = [...original, ...he];
  for (const sort of ["featured", "price-up", "price-down", "name"]) {
    const results = filterProducts(all, { sort });
    assert.ok(results.slice(0, 4).every((p) => p.brand === "HE"));
    assert.equal(results.length, 164);
  }
  const up = filterProducts(all, { sort: "price-up" });
  assert.deepEqual(
    up.slice(0, 4).map((p) => p.price),
    [18158.31, 19410.6, 21289.05, 24419.8],
  );
  assert.equal(filterProducts(all, { brand: "HE" }).length, 4);
  assert.equal(filterProducts(all, { query: "HE Paramotor" }).length, 4);
});
test("admin and seller deep links preserve their section and request the correct demo role", () => {
  assert.deepEqual(resolveRoute("/admin"), {
    page: "/painel/visao-geral",
    role: "admin",
  });
  assert.deepEqual(resolveRoute("/admin/vendedores"), {
    page: "/painel/vendedores",
    role: "admin",
  });
  assert.deepEqual(resolveRoute("/vendedor/produtos?novo=1"), {
    page: "/painel/produtos",
    role: "seller",
  });
  assert.deepEqual(resolveRoute("/catalogo?marca=HE"), {
    page: "/catalogo",
    role: null,
  });
  const paths = SCREEN_GROUPS.flatMap((g) => g.screens.map((s) => s[1]));
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.includes("/admin/configuracoes"));
  assert.ok(paths.includes("/vendedor/pedidos"));
});
