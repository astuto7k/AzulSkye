import { randomUUID } from "node:crypto";
import {
  db,
  rows,
  clean,
  requireValue as check,
  identifier,
  phoneNumber,
  sessionCookie,
  setCookie,
  issueSession,
  checkPassword,
  passwordHash,
  randomToken,
  digest,
  limit,
  catalogRows,
  productView,
  partnerFields,
} from "./store-db.js";
import { validateSubscription, publicPushKey } from "./store-push.js";
import { validateProduct, GROUPS, groupOf } from "../src/model.js";
import { SPECIALTIES, SERVICE_STATUSES } from "../src/workshops.js";
const orderFields =
  "id,buyer_id,created_at,amount,items,customer,delivery,status,paid_at,capture_method,fulfillment,expires_at";
const e = encodeURIComponent;
const homeSettings = {
  pickup:
    "A equipe AzulSkye combinará os detalhes da retirada pelo contato informado no pedido.",
};
const timestamp = () => new Date().toISOString();
export const publicCatalog = async () => {
  const [products, workshops, settings] = await Promise.all([
    catalogRows("&status=eq.approved"),
    rows(
      "store_partners?status=eq.approved&kind=eq.workshop&select=id,name,city,description,specialties,phone,person_type&order=name,id",
    ),
    db("store_settings?id=eq.shop&select=value"),
  ]);
  return {
    products: products
      .filter((p) => !p.partner_id || p.store_partners?.status === "approved")
      .map(productView),
    workshops,
    settings: settings[0]?.value || homeSettings,
  };
};
export async function accountAction(action, body, req, res) {
  if (action === "logout") {
    const token = sessionCookie(req);
    if (token)
      await db("store_sessions?token_hash=eq." + digest(token), {
        method: "DELETE",
      });
    setCookie(res, "", 0);
    return {};
  }
  const login = clean(body.login, 254, 5).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login), "Informe um e-mail válido.");
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown",
  ).split(",")[0];
  await Promise.all([
    limit("access-ip:" + ip, 45, 900),
    limit("access:" + action + ":" + login, 10, 900),
  ]);
  if (action === "register") {
    const name = clean(body.name, 100, 2),
      recovery = randomToken();
    const password_hash = await passwordHash(body.password);
    const [user] = await db("store_accounts?select=id", {
      method: "POST",
      prefer: "return=representation",
      body: { name, login, password_hash, recovery_hash: digest(recovery) },
    });
    await issueSession(res, user.id, password_hash);
    return { recovery };
  }
  const [row] = await db(
    "store_accounts?login=eq." +
      e(login) +
      "&select=id,password_hash,recovery_hash&limit=1",
  );
  if (action === "login") {
    const ok = await checkPassword(body.password, row?.password_hash);
    check(ok, "E-mail ou senha incorretos.", 401);
    await issueSession(res, row.id, row.password_hash);
    return {};
  }
  const proof = digest(clean(body.code, 100, 16)),
    recovery = randomToken();
  check(
    row && proof === row.recovery_hash,
    "E-mail ou código de recuperação inválido.",
    403,
  );
  const nextHash = await passwordHash(body.password);
  const changed = await db("rpc/store_reset_password", {
    method: "POST",
    body: {
      account: row.id,
      proof,
      password_value: nextHash,
      recovery_value: digest(recovery),
    },
  });
  check(changed, "O código já foi utilizado.", 409);
  await issueSession(res, row.id, nextHash);
  return { recovery };
}
export async function panel(user) {
  check(user, "Entre na sua conta.", 401);
  const admin = user.is_admin,
    uid = identifier(user.id);
  const own = await db(
    "store_partners?account_id=eq." +
      uid +
      "&select=" +
      partnerFields +
      "&order=kind",
  );
  const ids = own
    .filter((p) => p.status === "approved")
    .map((p) => identifier(p.id));
  const scope = ids.length
    ? "&or=(account_id.eq." + uid + ",partner_id.in.(" + ids.join(",") + "))"
    : "&account_id=eq." + uid;
  const [orders, requests, partners, products, favorites, settings] =
    await Promise.all([
      rows(
        "checkout_orders?select=" +
          orderFields +
          "&order=created_at.desc,id" +
          (admin ? "" : "&buyer_id=eq." + uid),
      ),
      rows(
        "store_requests?select=*,store_partners(name,kind),store_products(product->name)&order=created_at.desc,id" +
          (admin ? "" : scope),
      ),
      admin
        ? rows(
            "store_partners?select=" +
              partnerFields +
              "&order=updated_at.desc,id",
          )
        : own,
      admin
        ? catalogRows()
        : ids.length
          ? catalogRows("&partner_id=in.(" + ids.join(",") + ")")
          : [],
      rows(
        "store_favorites?account_id=eq." +
          uid +
          "&select=product_id&order=product_id",
      ),
      db("store_settings?id=eq.shop&select=value"),
    ]);
  return {
    user: {
      id: uid,
      email: user.login,
      name: user.name,
      role: admin
        ? "admin"
        : own.find((p) => p.status === "approved" && p.kind === "seller")
          ? "seller"
          : own.some((p) => p.status === "approved")
            ? "workshop"
            : "client",
    },
    own,
    orders,
    requests,
    partners,
    products: products.map(productView),
    favorites: favorites.map((f) => f.product_id),
    settings: settings[0]?.value || homeSettings,
  };
}
async function getPartner(id) {
  const [p] = await db("store_partners?id=eq." + identifier(id) + "&limit=1");
  check(p, "Cadastro não encontrado.", 404);
  return p;
}
async function versioned(table, id, version, patch) {
  const at = clean(version, 50);
  const list = await db(
    table +
      "?id=eq." +
      identifier(id) +
      "&updated_at=eq." +
      e(at) +
      "&select=id",
    {
      method: "PATCH",
      prefer: "return=representation",
      body: { ...patch, updated_at: timestamp() },
    },
  );
  check(
    list.length,
    "O cadastro mudou. Atualize a tela e confira a versão mais recente.",
    409,
  );
}
async function imageUrl(image, existing) {
  if (existing && image === existing) return existing;
  check(
    typeof image === "string" &&
      /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(image) &&
      image.length < 1350000,
    "Selecione uma imagem WebP válida de até 1 MB.",
  );
  const raw = Buffer.from(image.split(",")[1], "base64");
  check(
    raw.toString("ascii", 0, 4) === "RIFF" &&
      raw.toString("ascii", 8, 12) === "WEBP",
    "A foto enviada precisa ser uma imagem WebP.",
  );
  const key = digest(raw) + ".webp",
    base = process.env.SUPABASE_URL + "/storage/v1/object/";
  const res = await fetch(base + "store-images/" + key, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: raw,
    signal: AbortSignal.timeout(12000),
  });
  check(res.ok, "O armazenamento não conseguiu receber a foto.", 503);
  return base + "public/store-images/" + key;
}
export async function mutate(action, b, user) {
  check(user, "Entre na sua conta para continuar.", 401);
  const uid = user.id,
    admin = user.is_admin;
  if (action === "favorite") {
    const id = identifier(b.id);
    if (b.selected === true)
      await db("store_favorites?on_conflict=account_id,product_id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: { account_id: uid, product_id: id },
      });
    else
      await db(
        "store_favorites?account_id=eq." + uid + "&product_id=eq." + id,
        { method: "DELETE" },
      );
    return {};
  }
  if (action === "partner") {
    check(
      ["seller", "workshop"].includes(b.kind),
      "Escolha o tipo de cadastro.",
    );
    const phone = phoneNumber(b.phone),
      specialties = b.kind === "workshop" ? b.specialties : [];
    check(
      Array.isArray(specialties) &&
        specialties.length <= SPECIALTIES.length &&
        specialties.every((s) => SPECIALTIES.includes(s)) &&
        (b.kind === "seller" || specialties.length),
      "Selecione as especialidades.",
    );
    check(
      ["CPF", "CNPJ"].includes(b.person_type),
      "Selecione pessoa física ou jurídica.",
    );
    const data = {
      kind: b.kind,
      name: clean(b.name, 100, 2),
      city: clean(b.city, 100),
      description: clean(b.description, 1500),
      phone,
      person_type: b.person_type,
      specialties,
      status: "pending",
    };
    if (b.id) {
      const p = await getPartner(b.id);
      check(p.account_id === uid && p.kind === b.kind, "Acesso restrito.", 403);
      await versioned("store_partners", p.id, b.version, data);
    } else
      await db("store_partners", {
        method: "POST",
        body: { ...data, account_id: uid },
      });
    return {};
  }
  if (action === "partner-status") {
    check(admin, "Acesso administrativo necessário.", 403);
    check(["approved", "rejected"].includes(b.status), "Decisão inválida.");
    await versioned("store_partners", b.id, b.version, { status: b.status });
    return {};
  }
  if (action === "product" || action === "product-status") {
    let old = null;
    if (b.id) {
      [old] = await db("store_products?id=eq." + identifier(b.id) + "&limit=1");
      check(old, "Produto não encontrado.", 404);
    }
    const partnerId = old
      ? old.partner_id
      : admin
        ? null
        : identifier(b.partner_id);
    if (!admin) {
      const p = await getPartner(partnerId);
      check(
        p.account_id === uid && p.kind === "seller" && p.status === "approved",
        "Acesso de vendedor aprovado necessário.",
        403,
      );
    }
    if (action === "product-status") {
      check(
        old &&
          (admin
            ? ["approved", "hidden", "rejected"]
            : ["hidden", "pending"]
          ).includes(b.status),
        "Ação indisponível.",
        403,
      );
      await versioned("store_products", b.id, b.version, { status: b.status });
      return {};
    }
    const v = b.product || {},
      issue = validateProduct(v, !!old && !partnerId);
    check(!issue, issue);
    const price = Number(v.price),
      quantity = v.quantity === "" && !partnerId ? null : Number(v.quantity);
    check(
      Number.isFinite(price) &&
        price >= 0.01 &&
        price <= 99999999 &&
        (quantity === null ||
          (Number.isInteger(quantity) && quantity >= 0 && quantity <= 1000000)),
      "Revise o preço e a quantidade.",
    );
    check(GROUPS.slice(1).includes(v.category), "Categoria inválida.");
    const image = await imageUrl(v.image, old?.product.image);
    const product = {
      ...old?.product,
      name: clean(v.name, 140),
      description: clean(v.description, 3000),
      sku: clean(v.sku || "", 100, 0),
      condition: v.condition,
      price,
      categories:
        old && groupOf(old.product) === v.category
          ? old.product.categories
          : [v.category],
      stock: quantity !== 0,
      image,
      brand: clean(v.brand || "", 80, 0),
    };
    if (!old || image !== old.product.image) product.gallery = [image];
    for (const key of ["weight", "length", "width", "height"]) {
      const n = v[key] === "" || v[key] == null ? null : Number(v[key]);
      check(
        n === null || (Number.isFinite(n) && n > 0 && n <= 100000),
        "Medidas inválidas.",
      );
      product[key] = n;
    }
    const patch = {
      product,
      quantity,
      status: admin ? old?.status || "approved" : "pending",
    };
    if (old) await versioned("store_products", old.id, b.version, patch);
    else
      await db("store_products", {
        method: "POST",
        body: { ...patch, id: randomUUID(), partner_id: partnerId },
      });
    return {};
  }
  if (action === "request") {
    await limit("inquiry:" + uid, 20, 3600);
    const p = b.partner_id ? await getPartner(b.partner_id) : null;
    check(!p || p.status === "approved", "Parceiro indisponível.");
    let product_id = null;
    if (!p || p.kind === "seller") {
      product_id = identifier(b.product_id);
      const owner = p ? "eq." + p.id : "is.null";
      const [item] = await db(
        "store_products?id=eq." +
          product_id +
          "&partner_id=" +
          owner +
          "&status=eq.approved",
      );
      check(item && (!p || productView(item).stock), "Anúncio indisponível.");
    }
    await db("store_requests", {
      method: "POST",
      body: {
        account_id: uid,
        partner_id: p?.id || null,
        product_id,
        name: user.name,
        phone: phoneNumber(b.phone),
        equipment: clean(b.equipment, 140),
        message: clean(b.message, 1500),
      },
    });
    return {};
  }
  if (action === "reply") {
    const [r] = await db("store_requests?id=eq." + identifier(b.id));
    check(r, "Solicitação não encontrada.", 404);
    const p = r.partner_id ? await getPartner(r.partner_id) : null;
    check(
      admin || (p?.account_id === uid && p.status === "approved"),
      "Acesso restrito.",
      403,
    );
    const states =
      p?.kind === "workshop"
        ? SERVICE_STATUSES
        : ["Recebida", "Em negociação", "Concluída", "Cancelada"];
    check(states.includes(b.status), "Situação inválida.");
    await db("store_requests?id=eq." + r.id, {
      method: "PATCH",
      body: { status: b.status, reply: clean(b.reply || "", 1500, 0) },
    });
    return {};
  }
  check(admin, "Acesso administrativo necessário.", 403);
  if (action === "fulfill") {
    const steps = ["A preparar", "Pronto para retirada", "Retirado"],
      idx = steps.indexOf(b.status);
    check(idx > 0, "Etapa inválida.");
    const changed = await db(
      "checkout_orders?id=eq." +
        identifier(b.id) +
        "&status=eq.paid&fulfillment=eq." +
        e(steps[idx - 1]) +
        "&select=id",
      {
        method: "PATCH",
        prefer: "return=representation",
        body: { fulfillment: steps[idx] },
      },
    );
    check(
      changed.length,
      "Confira o pagamento e a etapa atual deste pedido.",
      409,
    );
    return {};
  }
  if (action === "settings") {
    await db("store_settings?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: { id: "shop", value: { pickup: clean(b.pickup, 1000, 4) } },
    });
    return {};
  }
  if (action === "push-key") return { key: await publicPushKey() };
  if (action === "push") {
    const subscription = validateSubscription(b.subscription);
    await db("store_push?on_conflict=endpoint", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: { endpoint: subscription.endpoint, account_id: uid, subscription },
    });
    return {};
  }
  if (action === "unpush") {
    await db(
      "store_push?account_id=eq." +
        uid +
        "&endpoint=eq." +
        e(clean(b.endpoint, 1800)),
      { method: "DELETE" },
    );
    return {};
  }
  check(false, "Operação desconhecida.", 404);
}
