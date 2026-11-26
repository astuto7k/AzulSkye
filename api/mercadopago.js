import { config, notify, pay, status } from "../server/mercadopago.js";
import { session, StoreError, requireValue } from "../server/store-db.js";
import { CheckoutError } from "../server/infinitepay.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const action = req.query?.action;
    if (req.method === "GET" && action === "config")
      return res.json(await config());
    requireValue(req.method === "POST", "Método inválido.", 405);
    requireValue(
      req.headers["content-type"]?.startsWith("application/json"),
      "Envie JSON.",
      415,
    );
    requireValue(
      req.body && JSON.stringify(req.body).length <= 16000,
      "Solicitação inválida.",
      413,
    );
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (action === "webhook") return res.json(await notify(req.query, body));
    requireValue(
      req.headers.origin &&
        req.headers.origin === process.env.APP_URL?.replace(/\/$/, ""),
      "Origem inválida.",
      403,
    );
    const token = String(req.headers.authorization || "").replace(
      /^Bearer /,
      "",
    );
    if (action === "status") return res.json(await status(token));
    requireValue(action === "pay", "Rota inválida.", 404);
    const ip = String(
      req.headers["x-vercel-forwarded-for"] ||
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        "",
    ).split(",")[0];
    return res.json(
      await pay(body, token, ip, (await session(req))?.id || null),
    );
  } catch (err) {
    const known = err instanceof StoreError || err instanceof CheckoutError;
    return res
      .status(known ? err.status : 503)
      .json({
        error: known
          ? err.message
          : "Não foi possível consultar o pagamento. Tente novamente.",
      });
  }
}
