import {
  createHash,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(derive);
export const digest = (text) => createHash("sha256").update(text).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireValue(condition, message, status = 400) {
  if (!condition) throw new StoreError(message, status);
}
export function clean(value, max, min = 1) {
  requireValue(
    typeof value === "string" &&
      value.trim().length >= min &&
      value.length <= max,
    "Confira os campos e os limites do formulário.",
  );
  return value.trim();
}
export function phoneNumber(value) {
  const digits = clean(value, 25)
    .replace(/\D/g, "")
    .replace(/^55(?=\d{10,11}$)/, "");
  requireValue(/^\d{10,11}$/.test(digits), "Informe o telefone com DDD.");
  return "55" + digits;
}
export function identifier(value) {
  requireValue(
    typeof value === "string" && /^[\w-]{1,100}$/.test(value),
    "Identificador inválido.",
  );
  return value;
}
export async function db(path, { method = "GET", body, prefer, headers } = {}) {
  const res = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new StoreError(
        "Este cadastro já existe ou foi alterado. Atualize a página.",
        409,
      );
    throw new StoreError(
      "Não foi possível acessar o banco da loja. Tente novamente.",
      503,
    );
  }
  const raw = await res.text();
  return raw ? JSON.parse(raw) : null;
}
export async function rows(path) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const part = await db(
      path + (path.includes("?") ? "&" : "?") + "limit=500&offset=" + offset,
    );
    all.push(...part);
    if (part.length < 500) return all;
  }
}
const cookieName = "__Host-azul_session";
export function sessionCookie(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
}
export async function session(req) {
  const token = sessionCookie(req);
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const [entry] = await db(
    "store_sessions?token_hash=eq." +
      digest(token) +
      "&expires_at=gt." +
      encodeURIComponent(new Date().toISOString()) +
      "&select=store_accounts(id,login,name,is_admin)&limit=1",
  );
  return entry?.store_accounts || null;
}
export async function issueSession(res, account, credential) {
  const token = randomToken();
  const saved = await db("rpc/store_open_session", {
    method: "POST",
    body: { account, credential, token_digest: digest(token) },
  });
  requireValue(saved, "Suas credenciais mudaram. Entre novamente.", 401);
  setCookie(res, token, 14 * 86400);
}
export function setCookie(res, value, age) {
  res.setHeader(
    "Set-Cookie",
    cookieName +
      "=" +
      value +
      "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" +
      age,
  );
}
export async function passwordHash(
  password,
  salt = randomBytes(16).toString("hex"),
) {
  requireValue(
    typeof password === "string" &&
      password.length >= 12 &&
      password.length <= 128,
    "Use uma senha de 12 a 128 caracteres.",
  );
  const hash = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return salt + ":" + hash.toString("hex");
}
export async function checkPassword(value, encoded) {
  const [salt, hash] = String(encoded || "").split(":");
  const result = await passwordHash(
    value,
    salt || "6b0405847909d85dee72e564523e191a",
  );
  return (
    !!hash &&
    /^[a-f0-9]{128}$/.test(hash) &&
    timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(result.split(":")[1], "hex"),
    )
  );
}
export async function limit(key, maximum, seconds) {
  const ok = await db("rpc/store_limit", {
    method: "POST",
    body: { bucket: digest(key), maximum, seconds },
  });
  requireValue(
    ok,
    "Muitas tentativas. Aguarde antes de tentar novamente.",
    429,
  );
}
export const partnerFields =
  "id,kind,status,name,city,phone,description,specialties,person_type,updated_at";
export function productView(row) {
  return {
    ...row.product,
    id: row.id,
    status: row.status,
    quantity: row.quantity,
    stock: row.product.stock && row.quantity !== 0,
    updated_at: row.updated_at,
    official: !row.partner_id,
    sellerId: row.partner_id || "official",
    seller: row.store_partners?.name || "AzulSkye",
    ...(row.partner_id ? { phone: row.store_partners?.phone } : {}),
  };
}
export async function catalogRows(where = "") {
  return rows(
    "store_products?select=*,store_partners(name,status,phone)&order=id.asc" +
      where,
  );
}
export async function checkoutProducts(ids) {
  ids.forEach(identifier);
  const result = await db(
    "store_products?partner_id=is.null&id=in.(" + ids.join(",") + ")",
  );
  return result.map(productView);
}
