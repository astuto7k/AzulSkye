import test from "node:test";
import assert from "node:assert/strict";
import {
  pay,
  status,
  notify,
  paymentDetails,
  sanitizeForm,
} from "../server/mercadopago.js";

const customer = {
  name: "Pessoa Teste",
  email: "checkout@example.test",
  phone: "(11) 91234-5678",
};
const p = {
  id: 123,
  external_reference: "MP-order",
  collector_id: 99,
  transaction_amount: 1.99,
  currency_id: "BRL",
  payment_method_id: "pix",
  date_last_updated: "2026-11-26T13:00:00Z",
};
test("verifica a referência, o valor, a moeda, o identificador e a modalidade", () => {
  const row = { id: "MP-order", amount: 199 };
  assert.equal(paymentDetails(row, p), "pix");
  for (const patch of [
    { external_reference: "other" },
    { transaction_amount: 1 },
    { currency_id: "USD" },
    { id: "a" },
    { payment_method_id: "boleto" },
  ])
    assert.throws(() => paymentDetails(row, { ...p, ...patch }));
  assert.throws(() => paymentDetails({ ...row, transaction_nsu: "mp:456" }, p));
});
test("cartão usa apenas token, parcelas, emissor e dados permitidos", () => {
  const data = sanitizeForm(
    {
      token: "example-card-token",
      installments: 3,
      payment_method_id: "visa",
      issuer_id: 123,
      card_number: "ignored",
      transaction_amount: 0.01,
    },
    customer,
  );
  assert.equal(data.three_d_secure_mode, "optional");
  assert.equal(data.installments, 3);
  assert.ok(!("card_number" in data));
  assert.ok(!("transaction_amount" in data));
  assert.throws(() => sanitizeForm({ ...data, installments: -1 }, customer));
});
test("Pix retorna QR, reaproveita tentativa após recarga e confirma pelo provedor no webhook", async (t) => {
  Object.assign(process.env, {
    SUPABASE_URL: "https://db.test",
    SUPABASE_SECRET_KEY: "sample",
    MERCADOPAGO_ACCESS_TOKEN: "TEST-token",
    MERCADOPAGO_PUBLIC_KEY: "TEST-public",
    APP_URL: "https://loja.test",
    CHECKOUT_DELIVERY_MODE: "pickup",
  });
  let order,
    providerBody,
    creates = 0,
    notices = 0;
  const payment = {
    ...p,
    status: "pending",
    point_of_interaction: {
      transaction_data: { qr_code: "copia-e-cola", qr_code_base64: "qr" },
    },
  };
  const json = (x) => new Response(JSON.stringify(x));
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const u = new URL(url),
      path = u.pathname;
    const body = init.body && JSON.parse(init.body);
    if (path === "/users/me") return json({ site_id: "MLB", id: 99 });
    if (path === "/v1/payment_methods")
      return json([{ id: "pix", status: "active" }]);
    if (path.endsWith("/store_products"))
      return json([
        {
          id: "item",
          product: { name: "Produto", stock: true, price: 1.99 },
          status: "approved",
          quantity: 2,
        },
      ]);
    if (path.endsWith("/checkout_orders")) return json(order ? [order] : []);
    if (path.endsWith("/create_checkout_order")) {
      order = body.order_data;
      return json(true);
    }
    if (path === "/v1/payments") {
      assert.equal(init.headers["X-Idempotency-Key"], order.id);
      providerBody = body;
      creates++;
      payment.external_reference = order.id;
      return json(payment);
    }
    if (path === "/v1/payments/123") return json(payment);
    if (path.endsWith("/store_apply_mp_payment")) {
      order.transaction_nsu = body.payment_key;
      order.status = body.payment_state === "approved" ? "paid" : "pending";
      return json(order.status);
    }
    if (path.endsWith("/store_claim_notice")) {
      notices++;
      return json(false);
    }
    throw Error("Unexpected " + path);
  });
  const body = {
    items: [{ id: "item", quantity: 1 }],
    customer,
    expectedAmount: 199,
    delivery: "pickup",
    form: { payment_method_id: "pix" },
  };
  const token = "a".repeat(64);
  await assert.rejects(
    pay({ ...body, expectedAmount: 1 }, token, "ip", null),
    /preço/,
  );
  const result = await pay(body, token, "ip", null);
  assert.equal(result.pix.code, "copia-e-cola");
  assert.equal((await pay(body, token, "ip", null)).id, result.id);
  assert.equal(creates, 1);
  assert.equal((await status(token)).pix.image, "qr");
  const query = Object.fromEntries(
    new URL(providerBody.notification_url).searchParams,
  );
  await assert.rejects(
    notify({ ...query, tag: "0".repeat(64) }, { data: { id: 123 } }),
  );
  await notify(query, { data: { id: 123 }, status: "approved" });
  assert.equal(order.status, "pending");
  payment.status = "approved";
  await notify(query, { data: { id: 123 } });
  assert.equal(order.status, "paid");
  assert.equal(notices, 1);
});
