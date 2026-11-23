import webpush from "web-push";
import { db, requireValue } from "./store-db.js";
async function keys() {
  const path = "store_settings?id=eq.webpush&select=value";
  const existing = await db(path);
  if (existing.length) return existing[0].value;
  await db("store_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates",
    body: { id: "webpush", value: webpush.generateVAPIDKeys() },
  });
  return (await db(path))[0].value;
}
export async function publicPushKey() {
  return (await keys()).publicKey;
}
export function validateSubscription(s) {
  let url;
  try {
    url = new URL(s?.endpoint);
  } catch {
    /* handled below */
  }
  requireValue(
    url?.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.href.length < 1800 &&
      /^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/.test(
        url.hostname,
      ) &&
      /^[\w-]{87}$/.test(s.keys?.p256dh) &&
      /^[\w-]{22}$/.test(s.keys?.auth),
    "Este navegador não forneceu uma assinatura de notificações compatível.",
  );
  return {
    endpoint: url.href,
    keys: { p256dh: s.keys.p256dh, auth: s.keys.auth },
  };
}
export async function notifySale(order) {
  const rows = await db(
    "store_push?select=endpoint,subscription,store_accounts!inner(is_admin)&store_accounts.is_admin=eq.true",
  );
  if (!rows.length) return;
  const k = await keys();
  const result = await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({
            title: "Venda confirmada · AzulSkye",
            body: "Confira o novo pedido no painel.",
            tag: order,
          }),
          {
            timeout: 5000,
            TTL: 86400,
            vapidDetails: {
              subject: process.env.APP_URL,
              publicKey: k.publicKey,
              privateKey: k.privateKey,
            },
          },
        );
      } catch (err) {
        if ([404, 410].includes(err.statusCode))
          await db(
            "store_push?endpoint=eq." + encodeURIComponent(row.endpoint),
            { method: "DELETE" },
          );
        else throw err;
      }
    }),
  );
  if (result.some((x) => x.status === "rejected")) throw Error("push delivery");
}
export async function deliverSale(id) {
  if (
    !(await db("rpc/store_claim_notice", {
      method: "POST",
      body: { order_id: id },
    }))
  )
    return;
  const path = "checkout_orders?id=eq." + encodeURIComponent(id);
  try {
    await notifySale(id);
    await db(path, { method: "PATCH", body: { push_state: "sent" } });
  } catch (error) {
    await db(path, { method: "PATCH", body: { push_state: "pending" } });
    throw error;
  }
}
