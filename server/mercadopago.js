import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import {
  db,
  digest,
  checkoutProducts,
  requireValue,
  StoreError,
} from "./store-db.js";
import { quoteCart, customerData } from "./infinitepay.js";
import { deliverSale } from "./store-push.js";

const env = process.env;
const base = "https://api.mercadopago.com";
const orderPattern = /^MP-[a-f0-9-]{36}$/;
const paymentPattern = /^\d{1,22}$/;
const callbackTag = (id) =>
  createHmac("sha256", env.SUPABASE_SECRET_KEY)
    .update("mp-notify:" + id)
    .digest("hex");
let cached;
export async function gateway(path, body, key) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + env.MERCADOPAGO_ACCESS_TOKEN,
      ...(body
        ? { "Content-Type": "application/json", "X-Idempotency-Key": key }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(14000),
  });
  if (!response.ok) {
    const err = new StoreError(
      "Não foi possível consultar o Mercado Pago agora.",
      502,
    );
    err.gatewayStatus = response.status;
    throw err;
  }
  return response.json();
}
export async function config() {
  const off = { enabled: false, deliveryMode: "pickup", shippingCents: 0 };
  if (
    !env.MERCADOPAGO_ACCESS_TOKEN ||
    !env.MERCADOPAGO_PUBLIC_KEY ||
    !env.SUPABASE_SECRET_KEY ||
    !env.APP_URL?.startsWith("https://") ||
    env.CHECKOUT_DELIVERY_MODE !== "pickup"
  )
    return off;
  if (cached?.until > Date.now()) return cached.value;
  const [methods, merchant] = await Promise.all([
    gateway("/v1/payment_methods"),
    gateway("/users/me"),
    db("checkout_orders?select=mp_updated_at&limit=0"),
  ]);
  const active = methods.filter((m) => m.status === "active");
  requireValue(
    merchant.site_id === "MLB" && merchant.id,
    "A conta de pagamentos precisa ser brasileira.",
    503,
  );
  const pix = active.some((m) => m.id === "pix");
  const card = active.some((m) => m.payment_type_id === "credit_card");
  const value = {
    ...off,
    enabled: pix || card,
    pix,
    card,
    publicKey: env.MERCADOPAGO_PUBLIC_KEY,
  };
  cached = {
    value,
    collector: String(merchant.id),
    cards: active
      .filter((m) => m.payment_type_id === "credit_card")
      .map((m) => m.id),
    until: Date.now() + 60000,
  };
  return value;
}
export function sanitizeForm(form, customer) {
  const method = form?.payment_method_id;
  const identification = form?.payer?.identification;
  const payer = { email: customer.email };
  if (identification?.number) {
    const number = String(identification.number).replace(/[.\s/-]/g, "");
    requireValue(
      (identification.type === "CPF" && /^\d{11}$/.test(number)) ||
        (identification.type === "CNPJ" && /^\d{14}$/.test(number)),
      "Confira o documento do pagador.",
    );
    payer.identification = { type: identification.type, number };
  }
  const [first, ...last] = customer.name.split(" ");
  payer.first_name = first;
  if (last.length) payer.last_name = last.join(" ");
  if (method === "pix") return { payer, payment_method_id: "pix" };
  requireValue(
    /^[a-z0-9_]{2,40}$/.test(method || "") &&
      /^[\w-]{10,250}$/.test(form?.token || "") &&
      Number.isInteger(Number(form.installments)) &&
      +form.installments >= 1 &&
      +form.installments <= 48,
    "Confira os dados e o parcelamento do cartão.",
  );
  const data = {
    payer,
    payment_method_id: method,
    token: form.token,
    installments: Number(form.installments),
    three_d_secure_mode: "optional",
  };
  if (/^\d{1,20}$/.test(String(form.issuer_id)))
    data.issuer_id = String(form.issuer_id);
  return data;
}
export function paymentDetails(row, p) {
  const method =
    p?.payment_method_id === "pix"
      ? "pix"
      : p?.payment_type_id === "credit_card"
        ? "credit_card"
        : null;
  requireValue(
    paymentPattern.test(String(p?.id)) &&
      p.external_reference === row.id &&
      p.currency_id === "BRL" &&
      (!env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-") ||
        p.live_mode === true) &&
      Math.round(Number(p.transaction_amount) * 100) === row.amount &&
      !!method &&
      (!row.transaction_nsu || row.transaction_nsu === "mp:" + p.id) &&
      Number.isFinite(Date.parse(p.date_last_updated)),
    "O pagamento precisa de conferência.",
    409,
  );
  return method;
}
async function apply(row, p) {
  const method = paymentDetails(row, p);
  if (!cached?.collector) await config();
  requireValue(
    cached?.collector === String(p.collector_id),
    "Recebedor incompatível.",
    409,
  );
  const status = await db("rpc/store_apply_mp_payment", {
    method: "POST",
    body: {
      order_key: row.id,
      payment_key: "mp:" + p.id,
      payment_state: p.status,
      changed_at: p.date_last_updated,
      method_key: method,
      amount_cents: row.amount,
      refunded_cents: Math.round((p.transaction_amount_refunded || 0) * 100),
    },
  });
  if (status === "paid") await deliverSale(row.id);
  const pix = p.point_of_interaction?.transaction_data;
  return {
    ...view(row),
    status,
    method,
    paymentId: String(p.id),
    ...(status === "pending" && method === "pix" && pix?.qr_code
      ? {
          pix: {
            code: pix.qr_code,
            image: pix.qr_code_base64,
            expires: p.date_of_expiration,
          },
        }
      : {}),
    ...(status === "pending" &&
    p.status_detail === "pending_challenge" &&
    p.three_ds_info?.creq
      ? {
          challenge: {
            creq: p.three_ds_info.creq,
            externalResourceURL: p.three_ds_info.external_resource_url,
          },
        }
      : {}),
  };
}
function view(row) {
  return {
    id: row.id,
    status: row.status,
    amount: row.amount,
    items: row.items,
    method: row.capture_method,
  };
}
async function find(token) {
  requireValue(
    /^[a-f0-9]{64}$/.test(token),
    "Sessão de pagamento inválida.",
    403,
  );
  const [row] = await db(
    "checkout_orders?access_hash=eq." + digest(token) + "&limit=1",
  );
  return row && orderPattern.test(row.id) ? row : null;
}
async function refresh(row) {
  if (
    [
      "declined",
      "cancelled",
      "refunded",
      "disputed",
      "partial_refund",
    ].includes(row.status)
  )
    return view(row);
  if (row.status === "paid") {
    await deliverSale(row.id);
    return view(row);
  }
  if (row.transaction_nsu)
    return apply(
      row,
      await gateway("/v1/payments/" + row.transaction_nsu.slice(3)),
    );
  const result = await gateway(
    "/v1/payments/search?external_reference=" + encodeURIComponent(row.id),
  );
  return result.results?.length ? apply(row, result.results[0]) : view(row);
}
export async function status(token) {
  const row = await find(token);
  return row ? refresh(row) : { status: "missing" };
}
export async function pay(body, token, ip, buyer) {
  const existing = await find(token);
  if (existing) return refresh(existing);
  const settings = await config();
  requireValue(
    settings.enabled && body.delivery === "pickup",
    "O pagamento está indisponível.",
    503,
  );
  requireValue(
    Array.isArray(body.items) &&
      body.items.length > 0 &&
      body.items.length <= 20,
    "Confira a sacola.",
  );
  const customer = customerData(body.customer);
  const form = sanitizeForm(body.form, customer);
  requireValue(
    form.payment_method_id === "pix"
      ? settings.pix
      : cached.cards.includes(form.payment_method_id),
    "Meio de pagamento indisponível.",
  );
  const quote = quoteCart(
    body.items,
    await checkoutProducts(body.items.map((i) => i?.id)),
  );
  requireValue(
    body.expectedAmount === quote.amount,
    "O preço mudou. Atualize a sacola.",
    409,
  );
  const id = "MP-" + randomUUID();
  const expires = new Date(
    Date.now() + (form.payment_method_id === "pix" ? 60 : 7 * 24 * 60) * 60000,
  ).toISOString();
  const row = {
    id,
    customer,
    ...quote,
    buyer_id: buyer,
    ip_hash: digest(env.SUPABASE_SECRET_KEY + ":" + ip),
    access_hash: digest(token),
    delivery: "pickup",
    shipping_amount: 0,
    status: "creating",
    expires_at: expires,
  };
  try {
    const ok = await db("rpc/create_checkout_order", {
      method: "POST",
      body: { order_data: row },
    });
    requireValue(
      ok,
      "Limite de pedidos atingido. Aguarde para tentar novamente.",
      429,
    );
  } catch (err) {
    const duplicate = await find(token);
    if (duplicate) return refresh(duplicate);
    throw err;
  }
  const payment = {
    ...form,
    transaction_amount: row.amount / 100,
    description: "AzulSkye · " + quote.items[0].description.slice(0, 120),
    external_reference: id,
    notification_url:
      env.APP_URL.replace(/\/$/, "") +
      "/api/mercadopago?action=webhook&order=" +
      id +
      "&tag=" +
      callbackTag(id) +
      "&source_news=webhooks",
    additional_info: {
      items: quote.items.map((item) => ({
        id: item.id,
        title: item.description,
        quantity: item.quantity,
        unit_price: item.price / 100,
      })),
    },
    ...(form.payment_method_id === "pix"
      ? { date_of_expiration: expires }
      : {}),
  };
  let result;
  try {
    result = await gateway("/v1/payments", payment, id);
  } catch (err) {
    // An interrupted request may already have charged the customer. Keep its
    // reference for reconciliation instead of submitting a second payment.
    const definitive = [400, 401, 403, 404, 422].includes(err.gatewayStatus);
    const state = definitive ? "declined" : "review";
    await db("checkout_orders?id=eq." + id + "&status=eq.creating", {
      method: "PATCH",
      body: { status: state },
    });
    return { ...view(row), status: state };
  }
  return apply(row, result);
}
export async function notify(query, body) {
  const id = query.order;
  requireValue(
    orderPattern.test(id) &&
      /^[a-f0-9]{64}$/.test(query.tag || "") &&
      timingSafeEqual(Buffer.from(query.tag), Buffer.from(callbackTag(id))),
    "Notificação inválida.",
    403,
  );
  if (body.type && body.type !== "payment") return { received: true };
  const paymentId = String(body.data?.id || query["data.id"] || "");
  requireValue(paymentPattern.test(paymentId), "Pagamento inválido.");
  const [row] = await db("checkout_orders?id=eq." + id + "&limit=1");
  requireValue(row, "Pedido não encontrado.", 404);
  await apply(row, await gateway("/v1/payments/" + paymentId));
  return { received: true };
}
