import test from "node:test";
import assert from "node:assert/strict";
import {
  workshopSeed,
  validateWorkshop,
  visibleWorkshopRequests,
} from "../src/workshops.js";
import { resolveRoute } from "../src/routes.js";
import { DEMO_ACCOUNTS } from "../src/model.js";
import { readFileSync } from "node:fs";
test("new partner login and deep links select workshop instead of seller workspace", () => {
  assert.equal(DEMO_ACCOUNTS.filter((a) => a.role === "workshop").length, 1);
  assert.deepEqual(resolveRoute("/oficina/solicitacoes"), {
    page: "/painel/solicitacoes",
    role: "workshop",
  });
  assert.deepEqual(resolveRoute("/admin/oficinas"), {
    page: "/painel/oficinas",
    role: "admin",
  });
});
test("CPF and CNPJ partner registration requires specialty and valid contact", () => {
  const profile = workshopSeed().workshops[0];
  for (const documentType of ["CPF", "CNPJ"])
    assert.equal(validateWorkshop({ ...profile, documentType }), "");
  assert.notEqual(validateWorkshop({ ...profile, specialties: [] }), "");
  assert.notEqual(validateWorkshop({ ...profile, email: "invalid" }), "");
  assert.notEqual(
    validateWorkshop({ ...profile, specialties: ["unregistered"] }),
    "",
  );
});
test("workshops only view their own maintenance requests and sellers do not receive workshop access", () => {
  const requests = [
    { id: "1", workshopId: "a", customerId: "x" },
    { id: "2", workshopId: "b", customerId: "y" },
  ];
  assert.deepEqual(
    visibleWorkshopRequests(requests, {
      role: "workshop",
      workshopId: "a",
    }).map((r) => r.id),
    ["1"],
  );
  assert.deepEqual(
    visibleWorkshopRequests(requests, { role: "client", email: "y" }).map(
      (r) => r.id,
    ),
    ["2"],
  );
  assert.equal(visibleWorkshopRequests(requests, { role: "seller" }).length, 0);
  assert.equal(visibleWorkshopRequests(requests, { role: "admin" }).length, 2);
  assert.equal(visibleWorkshopRequests(requests, null).length, 0);
});
test("all copied prices receive one 5% increase and the unpriced product stays unpriced", () => {
  const read = (name) =>
    JSON.parse(readFileSync(new URL("../src/data/" + name, import.meta.url)));
  const products = [...read("products.json"), ...read("he-products.json")];
  assert.equal(products.filter((p) => p.price !== null).length, 163);
  assert.equal(products.find((p) => p.id === "1820").price, null);
  assert.equal(
    Math.round(products.reduce((s, p) => s + (p.price || 0), 0) * 100),
    70717004,
  );
  for (const p of products.filter((p) => p.price !== null)) {
    const changes = p.priceAdjustments.filter(
      (a) => a.id === "catalog-2026-11-05-plus5",
    );
    assert.equal(changes.length, 1);
    assert.equal(changes[0].newPrice, p.price);
  }
});
