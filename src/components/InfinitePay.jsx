import { useEffect, useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { money, orderGroups } from '../model.js';

async function request(action, body, token) {
  const response = await fetch(`/api/infinitepay?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Pagamento indisponível no momento. Nenhuma confirmação foi registrada.');
  return result;
}
function accessToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}
export function InfinitePayCheckout({ cart, products }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem('azulskye-checkout-attempt') || accessToken(); } catch { return accessToken(); }
  });
  const groups = orderGroups(cart, products);
  const official = groups.find(g => g.sellerId === 'official');
  const hasMarketplace = groups.some(g => g.sellerId !== 'official');
  useEffect(() => { request('config').then(setConfig).catch(() => setConfig({ enabled: false })); }, []);
  const total = (official?.total || 0) + (config?.shippingCents || 0) / 100;
  async function submit(event) {
    event.preventDefault();
    if (!config?.enabled || !official || hasMarketplace || busy) return;
    setError(''); setBusy(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const digits = values.phone.replace(/\D/g, '');
      const phone = `+55${digits.length <= 11 ? digits : digits.replace(/^55/, '')}`;
      // Persist access before requesting the provider, so a failed browser write never loses a live checkout.
      sessionStorage.setItem('azulskye-checkout-attempt', token);
      localStorage.setItem('azulskye-last-payment-attempt', token);
      const result = await request('checkout', {
        items: official.items.map(({ id, quantity }) => ({ id, quantity })),
        expectedAmount: Math.round(total * 100), accessToken: token,
        customer: { name: values.name, email: values.email, phone }, delivery: config.deliveryMode,
      });
      localStorage.setItem(`azulskye-payment-${result.id}`, token);
      sessionStorage.removeItem('azulskye-checkout-attempt');
      window.location.assign(result.url);
    } catch (error) { setError(error.message); setBusy(false); }
  }
  return <section className="panel infinitepay-checkout" aria-labelledby="infinitepay-title">
    <div className="infinitepay-heading"><CreditCard size={24} /><div><h2 id="infinitepay-title">Pix e cartão · InfinitePay</h2><p>Pagamento da loja oficial AzulSkye.</p></div></div>
    {!config ? <p role="status">Verificando disponibilidade do pagamento…</p> : !config.enabled ?
      <p className="settings-notice" role="status">O pagamento online está em configuração. Nenhuma cobrança será criada. O pedido de demonstração continua disponível abaixo.</p> : <>
      <p>Você pagará na página segura da InfinitePay e poderá voltar para consultar a confirmação. O login demonstrativo não é necessário para esta compra.</p>
      {hasMarketplace ? <p className="form-error" role="alert">Para pagar a loja oficial, retire da sacola os anúncios de outros vendedores. O marketplace ainda não aceita pagamento online.</p> : !official ? <p>Adicione um produto da loja oficial para pagar com Pix ou cartão.</p> :
      <form className="form-stack" onSubmit={submit}>
        <label>Seu nome<input name="name" autoComplete="name" required minLength={3} maxLength={140} /></label>
        <label>E-mail para o pedido<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Celular com DDD<input name="phone" type="tel" autoComplete="tel" required placeholder="(11) 99999-9999" maxLength={20} /></label>
        <div className="checkout-seller"><span>Produtos</span><strong>{money(official.total)}</strong></div>
        <div className="checkout-seller"><span>{config.deliveryMode === 'pickup' ? 'Retirada combinada (sem envio)' : 'Frete fixo'}</span><strong>{money(config.shippingCents / 100)}</strong></div>
        <label className="infinitepay-consent"><input type="checkbox" required />{config.deliveryMode === 'pickup' ? 'Entendo que esta compra é para retirada combinada com a AzulSkye e não inclui envio.' : 'Concordo com o valor do frete. Informarei meu endereço na InfinitePay.'}</label>
        <div className="checkout-seller"><span>Total antes de taxas de parcelamento</span><strong>{money(total)}</strong></div>
        <p className="muted">Parcelamento e eventuais taxas são apresentados pela InfinitePay antes de você confirmar o pagamento.</p>
        {error && <><p className="form-error" role="alert">{error}</p><button type="button" className="text-link" onClick={() => { sessionStorage.removeItem('azulskye-checkout-attempt'); setToken(accessToken()); setError(''); }}>Iniciar outra tentativa</button></>}
        <button className="btn btn-primary full" type="submit" disabled={busy}>{busy ? 'Preparando pagamento…' : 'Pagar com Pix ou cartão'}</button>
        <p className="infinitepay-secure"><ShieldCheck size={16} /> Dados do cartão são informados somente na InfinitePay.</p>
      </form>}
    </>}
  </section>;
}
export function InfinitePayReturn({ onPaid }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  async function check() {
    setError(''); setBusy(true);
    try {
      const params = new URLSearchParams(location.search || location.hash.split('?')[1] || '');
      const id = params.get('order') || params.get('order_nsu');
      let token = localStorage.getItem(`azulskye-payment-${id}`);
      if (!token) {
        // Recover after a redirect or browser interruption before the order id was stored.
        token = sessionStorage.getItem('azulskye-checkout-attempt') || localStorage.getItem('azulskye-last-payment-attempt');
      }
      if (!token) throw new Error('Abra esta página no mesmo navegador em que iniciou a compra. Se você já pagou, confira também o comprovante recebido da InfinitePay.');
      const result = await request('status', { order: id, transaction: params.get('transaction_nsu'), slug: params.get('slug') }, token);
      localStorage.setItem(`azulskye-payment-${id}`, token);
      setOrder(result);
      if (result.status === 'paid') {
        sessionStorage.removeItem('azulskye-checkout-attempt');
        const marker = `azulskye-payment-applied-${id}`;
        if (!localStorage.getItem(marker)) {
          onPaid(result.items);
          localStorage.setItem(marker, 'true');
        }
      }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { check(); }, []);
  return <section className="wrap section infinitepay-return"><div className="panel">
    <span className="eyebrow">PEDIDO DA LOJA OFICIAL</span>
    <h1>{order?.status === 'paid' ? 'Pagamento confirmado' : 'Consulte seu pagamento'}</h1>
    {busy && <p role="status">Confirmando o pagamento com a InfinitePay…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {order && <>
      <p>Pedido <strong>{order.id}</strong></p>
      <p role="status">{order.status === 'paid' ? `Recebido via ${order.captureMethod === 'pix' ? 'Pix' : 'cartão de crédito'}.` : order.status === 'review' ? 'A criação do pagamento precisa de verificação. Se já pagou, não pague novamente.' : 'Pagamento ainda não confirmado. Se você já pagou, aguarde e consulte novamente.'}</p>
      {order.expired && order.status !== 'paid' && <p>O prazo do link terminou. A expiração não confirma nem cancela um pagamento já realizado.</p>}
      {order.items.map(item => <div className="checkout-seller" key={item.id}><span>{item.quantity} × {item.description}</span><strong>{money(item.price * item.quantity / 100)}</strong></div>)}
      <p>Total do pedido: <strong>{money(order.amount / 100)}</strong></p>
      <p>{order.delivery === 'pickup' ? 'Retirada combinada com a AzulSkye, sem envio.' : 'Entrega no endereço informado no checkout InfinitePay.'}</p>
    </>}
    <div className="button-row"><button className="btn btn-primary" onClick={check} disabled={busy}>Consultar novamente</button><a className="btn btn-outline" href="#/catalogo">Voltar à loja</a></div>
  </div></section>;
}

export function InfinitePayStatus() {
  const [enabled, setEnabled] = useState(null);
  useEffect(() => { request('config').then(c => setEnabled(c.enabled)).catch(() => setEnabled(false)); }, []);
  return <section className="panel integration-card">
    <CreditCard size={30} />
    <div><strong>{enabled === null ? 'Consultando conexão…' : enabled ? 'CHECKOUT ATIVO · LOJA OFICIAL' : 'CHECKOUT EM CONFIGURAÇÃO'}</strong>
      <h2>Pagamentos com InfinitePay</h2>
      <p>Os indicadores deste painel são demonstrações. Consulte as vendas reais e os recebimentos na InfinitePay. Pedidos do checkout são registrados no banco, sem divisão automática ou repasses a vendedores do marketplace.</p>
      <a className="btn btn-outline" href="https://app.infinitepay.io/sales" target="_blank" rel="noreferrer">Ver vendas na InfinitePay</a>
    </div>
  </section>;
}
