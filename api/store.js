import {
  accountAction,
  mutate,
  panel,
  publicCatalog,
} from "../server/store.js";
import { requireValue, session, StoreError } from "../server/store-db.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const action = req.query?.action;
  try {
    if (req.method === "GET" && action === "catalog")
      return res.status(200).json(await publicCatalog());
    if (req.method === "GET" && action === "me") {
      const user = await session(req);
      return res.status(200).json(user ? await panel(user) : { user: null });
    }
    requireValue(req.method === "POST", "Método não permitido.", 405);
    requireValue(
      req.headers.origin &&
        req.headers.origin === process.env.APP_URL?.replace(/\/$/, ""),
      "Origem não permitida.",
      403,
    );
    requireValue(
      String(req.headers["content-type"]).startsWith("application/json"),
      "Envie JSON.",
      415,
    );
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    requireValue(
      b &&
        typeof b === "object" &&
        !Array.isArray(b) &&
        JSON.stringify(b).length < (action === "product" ? 1450000 : 15000),
      "Solicitação inválida.",
      400,
    );
    const result = ["login", "register", "recover", "logout"].includes(action)
      ? await accountAction(action, b, req, res)
      : await mutate(action, b, await session(req));
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(error instanceof StoreError ? error.status : 503)
      .json({
        error:
          error instanceof StoreError
            ? error.message
            : "Não foi possível concluir. Tente novamente.",
      });
  }
}
