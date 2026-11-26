import {usableHandoff} from '../checkout-handoff.js';
import '../checkout.css';
import { useEffect, useState } from 'react';
import { money } from '../model.js';

async function request(action, body, token) {
  const response = await fetch(`/api/infinitepay?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Pagamento indisponível no momento. Tente novamente.');
    error.field = result.field;
    error.newAttempt = result.newAttempt === true;
    throw error;
  }
  return result;
}
const handoffKey = 'azulskye-payment-handoff';
function readHandoff() {
  try {
    const value = JSON.parse(sessionStorage.getItem(handoffKey));
    if (usableHandoff(value, value?.cartKey)) return value;
  } catch { /* An unavailable or cleared session starts a fresh checkout. */ }
  return null;
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
        if (readHandoff()?.id === id) sessionStorage.removeItem(handoffKey);
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
