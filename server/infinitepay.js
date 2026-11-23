import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';

const catalog = ['products.json', 'he-products.json'].flatMap(name => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url))));
const sha = value => createHash('sha256').update(value).digest('hex');
export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function settings(env = process.env) {
  const origin = env.APP_URL?.replace(/\/$/, '');
  const ready = env.INFINITEPAY_ENABLED === 'true' && !!env.INFINITEPAY_API_KEY &&
    !!env.INFINITEPAY_HANDLE && !!env.SUPABASE_URL && !!env.SUPABASE_SERVICE_ROLE_KEY &&
    /^https:\/\//.test(origin || '') && ['pickup', 'flat'].includes(env.CHECKOUT_DELIVERY_MODE) &&
    (env.CHECKOUT_DELIVERY_MODE !== 'flat' || /^\d+$/.test(env.CHECKOUT_SHIPPING_CENTS || ''));
  return { ready, origin, deliveryMode: env.CHECKOUT_DELIVERY_MODE, shippingCents: env.CHECKOUT_DELIVERY_MODE === 'flat' ? Number(env.CHECKOUT_SHIPPING_CENTS) : 0 };
}
export function quoteCart(lines, products = catalog) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 20) throw new CheckoutError('Escolha entre 1 e 20 itens da loja oficial.');
  const seen = new Set();
  const items = lines.map(line => {
    const p = products.find(p => p.id === line.id);
    if (!p?.official || p.sellerId !== 'official' || ['hidden', 'rejected'].includes(p.status) || !p.stock || !(p.price > 0))
      throw new CheckoutError('Um item não está disponível para pagamento online na loja oficial. Atualize sua sacola.');
    if (seen.has(p.id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10)
      throw new CheckoutError('Quantidade inválida. Escolha de 1 a 10 unidades por produto.');
    seen.add(p.id);
    return { id: p.id, description: p.name, quantity: line.quantity, price: Math.round(p.price * 100) };
  });
  const amount = items.reduce((total, p) => total + p.price * p.quantity, 0);
  if (!Number.isSafeInteger(amount) || amount < 100) throw new CheckoutError('O pedido mínimo é de R$ 1,00.');
  return { items, amount };
}
export function customerData(input) {
  if (!input || typeof input.name !== 'string' || input.name.trim().length < 3 || input.name.length > 140 ||
    typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 ||
    typeof input.phone !== 'string' || !/^\+55\d{10,11}$/.test(input.phone))
    throw new CheckoutError('Preencha nome, e-mail e telefone brasileiro válidos.');
  return { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone_number: input.phone };
}
export function safeCheckoutUrl(value) {
  try { const u = new URL(value); if (u.protocol === 'https:' && u.hostname === 'checkout.infinitepay.io') return u.href;
    if (u.protocol === 'https:' && u.hostname === 'buy.infinitepay.io') return u.href;
  } catch { /* provider returned no valid URL */ }
  throw new CheckoutError('A InfinitePay não retornou um endereço de pagamento válido.', 502);
}
export function verifiedPayment(result, expectedAmount) {
  return result?.success === true && result?.paid === true && result.amount === expectedAmount &&
    Number.isSafeInteger(result.paid_amount) && result.paid_amount >= expectedAmount &&
    ['pix', 'credit_card'].includes(result.capture_method);
}
function accessMatches(token, hash) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !hash) return false;
  return timingSafeEqual(Buffer.from(sha(token), 'hex'), Buffer.from(hash, 'hex'));
}
export function makeService({ env = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  const config = settings(env);
  async function db(path, { method = 'GET', body, prefer } = {}) {
    const response = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      method, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new CheckoutError('Não foi possível salvar ou consultar o pedido. Tente novamente.', 503);
    return response.status === 204 ? null : await response.json();
  }
  async function provider(path, body) {
    const response = await fetchImpl(`https://api.checkout.infinitepay.io/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.INFINITEPAY_API_KEY },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new CheckoutError('A InfinitePay não conseguiu processar a solicitação. Tente novamente.', 502);
    return response.json();
  }
  async function lookup(id) {
    if (typeof id !== 'string' || !/^AZ-[a-f0-9-]{36}$/.test(id)) throw new CheckoutError('Pedido inválido.');
    const rows = await db(`checkout_orders?id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!rows.length) throw new CheckoutError('Pedido não encontrado.', 404);
    return rows[0];
  }
  function enabled() { if (!config.ready) throw new CheckoutError('O pagamento online está em configuração. Nenhuma cobrança foi criada.', 503); }
  async function create(body, ip = 'unknown') {
    enabled();
    const quote = quoteCart(body.items);
    const customer = customerData(body.customer);
    if (!/^[a-f0-9]{64}$/.test(body.accessToken || '')) throw new CheckoutError('Sessão de compra inválida. Reabra o checkout.');
    if (body.delivery !== config.deliveryMode) throw new CheckoutError('Confirme a forma de entrega disponível.');
    if (!Number.isSafeInteger(body.expectedAmount) || body.expectedAmount !== quote.amount + config.shippingCents)
      throw new CheckoutError('Os preços mudaram. Atualize a sacola antes de pagar.', 409);
    const requestId = sha(body.accessToken);
    const existing = await db(`checkout_orders?access_hash=eq.${requestId}&limit=1`);
    if (existing.length) {
      const row = existing[0];
      if (row.amount !== body.expectedAmount || JSON.stringify(row.items) !== JSON.stringify(quote.items) || row.customer.email !== customer.email)
        throw new CheckoutError('Sua sacola mudou. Reabra o checkout para criar outro pedido.', 409);
      if (row.checkout_url && row.status === 'pending' && new Date(row.expires_at) > now()) return { id: row.id, url: row.checkout_url };
      throw new CheckoutError('Este pedido já foi iniciado. Consulte o pagamento ou reabra o checkout.', 409);
    }
    // The database function applies the rate limit and creates one unique order atomically.
    const id = `AZ-${randomUUID()}`;
    const expiresAt = new Date(now().getTime() + 30 * 60000).toISOString();
    const order = { id, access_hash: requestId, ip_hash: sha(`${env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`), customer,
      items: quote.items, amount: quote.amount + config.shippingCents, shipping_amount: config.shippingCents,
      delivery: config.deliveryMode, status: 'creating', expires_at: expiresAt };
    const accepted = await db('rpc/create_checkout_order', { method: 'POST', body: { order_data: order } });
    if (!accepted) throw new CheckoutError('Limite de tentativas atingido. Aguarde antes de tentar novamente.', 429);
    const items = [...quote.items.map(({ description, price, quantity }) => ({ description, price, quantity }))];
    if (config.shippingCents > 0) items.push({ description: 'Frete', quantity: 1, price: config.shippingCents });
    try {
      const result = await provider('links', { handle: env.INFINITEPAY_HANDLE, items, customer, order_nsu: id,
        redirect_url: `${config.origin}/pagamento?order=${id}`,
        webhook_url: `${config.origin}/api/infinitepay?action=webhook`,
        options: { single_payment: true, valid_until: expiresAt, payment_methods_enabled: ['pix', 'credit_card'], require_delivery_address: config.deliveryMode !== 'pickup' },
      });
      const url = safeCheckoutUrl(result.url);
      await db(`checkout_orders?id=eq.${id}&status=eq.creating`, { method: 'PATCH', body: { checkout_url: url, status: 'pending' }, prefer: 'return=minimal' });
      return { id, url };
    } catch (error) {
      // Preserve the row if the provider may have created a charge; never create another link automatically.
      await db(`checkout_orders?id=eq.${id}&status=eq.creating`, { method: 'PATCH', body: { status: 'review' }, prefer: 'return=minimal' }).catch(() => {});
      throw error;
    }
  }
  async function confirm(row, transaction, slug) {
    if (typeof transaction !== 'string' || transaction.length > 200 || !/^[\w-]+$/.test(transaction) ||
        typeof slug !== 'string' || slug.length > 200 || !/^[\w-]+$/.test(slug)) throw new CheckoutError('Referência de pagamento inválida.');
    const result = await provider('payment_check', { handle: env.INFINITEPAY_HANDLE, order_nsu: row.id, transaction_nsu: transaction, slug });
    if (verifiedPayment(result, row.amount)) {
      await db('rpc/confirm_checkout_payment', { method: 'POST', body: { order_id: row.id, transaction_id: transaction, invoice: slug, method: result.capture_method, paid: result.paid_amount } });
      row = { ...row, status: 'paid', capture_method: result.capture_method };
    }
    return row;
  }
  async function status(body, token) {
    enabled();
    let row = await lookup(body.order);
    if (!accessMatches(token, row.access_hash)) throw new CheckoutError('Use o navegador em que iniciou esta compra para consultar o pedido.', 403);
    if (row.status !== 'paid' && body.transaction && body.slug) row = await confirm(row, body.transaction, body.slug);
    return { id: row.id, status: row.status, amount: row.amount, items: row.items, delivery: row.delivery,
      captureMethod: row.capture_method || null, expired: new Date(row.expires_at) < now() };
  }
  async function webhook(body) {
    // Webhooks are unsigned. Never trust event status, amount, receipt_url, or items from the callback.
    enabled();
    let row = await lookup(body.order_nsu);
    if (row.status !== 'paid') row = await confirm(row, body.transaction_nsu, body.invoice_slug || body.slug);
    if (row.status !== 'paid') throw new CheckoutError('Pagamento ainda não confirmado.', 409);
    return { received: true };
  }
  return { config, create, status, webhook };
}
export function newAccessToken() { return randomBytes(32).toString('hex'); }
