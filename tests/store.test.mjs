import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPassword,
  passwordHash,
  productView,
  session,
} from "../server/store-db.js";
import { publicCatalog, mutate } from "../server/store.js";
import { validateSubscription } from "../server/store-push.js";
import handle from "../api/store.js";

test("account passwords use unique salts and sessions require a valid persisted token", async () => {
  const a = await passwordHash("senha-longa-para-teste"),
    b = await passwordHash("senha-longa-para-teste");
  assert.notEqual(a, b);
  assert.equal(await checkPassword("senha-longa-para-teste", a), true);
  assert.equal(await checkPassword("outra-senha-de-teste", a), false);
  assert.equal(await session({ headers: {} }), null);
});
test("panel actions need a server account and administrative decisions need the administrator", async () => {
  for (const action of ["partner-status", "fulfill", "settings", "push-key"]) {
    await assert.rejects(mutate(action, {}, null), { status: 401 });
    await assert.rejects(mutate(action, {}, { id: "user", is_admin: false }), {
      status: 403,
    });
  }
});
test("public catalog requires both an approved listing and an approved seller; depleted inventory is unavailable", async () => {
  const orig = global.fetch;
  const product = {
    id: "p",
    status: "approved",
    product: { stock: true },
    quantity: 0,
    partner_id: null,
  };
  assert.equal(productView(product).stock, false);
  global.fetch = async (url) =>
    new Response(
      JSON.stringify(
        url.includes("store_products")
          ? [
              product,
              {
                ...product,
                id: "private",
                partner_id: "s",
                store_partners: { status: "pending" },
              },
            ]
          : [],
      ),
    );
  try {
    const data = await publicCatalog();
    assert.deepEqual(
      data.products.map((p) => p.id),
      ["p"],
    );
  } finally {
    global.fetch = orig;
  }
});
test("push accepts supported browser providers and rejects unrecognized notification services", () => {
  const keys = { p256dh: "a".repeat(87), auth: "b".repeat(22) };
  assert.equal(
    validateSubscription({
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys,
    }).keys.auth,
    keys.auth,
  );
  assert.throws(() =>
    validateSubscription({ endpoint: "https://example.com/send", keys }),
  );
});
test("guest requests return no account data and method validation occurs before mutations", async () => {
  let code, content;
  const res = {
    setHeader() {},
    status(n) {
      code = n;
      return this;
    },
    json(p) {
      content = p;
    },
  };
  await handle({ method: "GET", query: { action: "me" }, headers: {} }, res);
  assert.equal(code, 200);
  assert.deepEqual(content, { user: null });
  await handle(
    { method: "POST", query: { action: "settings" }, headers: {}, body: {} },
    res,
  );
  assert.equal(code, 403);
});
