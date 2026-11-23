import {checkoutContact} from '../checkout-contact.js';
import '../checkout.css';
import { useEffect, useRef, useState } from 'react';
import { CreditCard, ArrowLeft, ArrowRight, LockKeyhole, MapPin, ShoppingBag, UserRound } from 'lucide-react';
import { money, orderGroups } from '../model.js';

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
function accessToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}
const fields = [
  {name:'name',label:'Nome do comprador',autoComplete:'name',type:'text',maxLength:140},
  {name:'email',label:'E-mail',autoComplete:'email',type:'email',maxLength:254},
  {name:'phone',label:'Telefone com DDD',autoComplete:'tel',type:'tel',placeholder:'(11) 91234-5678',maxLength:32},
];

function CheckoutSummary({group,config,total}) {
  const [all,setAll] = useState(false);
  const visible = all ? group.items : group.items.slice(0,2);
  return <aside className="ck-summary">
    <div className="ck-summary-title"><ShoppingBag size={20}/><h2>Seu pedido</h2><a href="#/sacola">Editar</a></div>
    <ul>{visible.map(p=><li key={p.id}><img src={p.image} alt="" width="60" height="60"/>
      <div><strong>{p.name}</strong><small>{p.quantity} {p.quantity===1?'unidade':'unidades'}</small></div>
      <b>{money(p.price*p.quantity)}</b></li>)}</ul>
    {group.items.length>2 && <button type="button" className="text-link" onClick={()=>setAll(!all)}>{all?'Ver menos':'Ver todos os '+group.items.length+' itens'}</button>}
    <dl><div><dt>Subtotal</dt><dd>{money(group.total)}</dd></div>
      <div><dt>{config?.deliveryMode==='pickup'?'Retirada':'Entrega'}</dt><dd>{config?.enabled ? config.deliveryMode==='pickup'?'Grátis':money(config.shippingCents/100) : 'A confirmar'}</dd></div>
      <div className="ck-total"><dt>Total</dt><dd>{config?.enabled ? money(total) : 'A confirmar'}</dd></div></dl>
  </aside>;
}

export function InfinitePayCheckout({ cart, products, user, pickup }) {
  const [config,setConfig] = useState(null);
  const [fieldErrors,setFieldErrors] = useState({});
  const [error,setError] = useState(null);
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const [token,setToken] = useState(()=>{
    try { return sessionStorage.getItem('azulskye-checkout-attempt') || accessToken(); } catch { return accessToken(); }
  });
  const groups = orderGroups(cart,products);
  const official = groups.find(g=>g.sellerId==='official');
  const hasMarketplace = groups.some(g=>g.sellerId!=='official');
  function loadConfig(){
    setConfig(null);
    request('config').then(setConfig).catch(()=>setConfig({enabled:false}));
  }
  useEffect(()=>{loadConfig();},[]);
  const total = (official?.total || 0) + (config?.shippingCents || 0)/100;
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !config?.enabled || !official || hasMarketplace) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const {customer,errors} = checkoutContact(values);
    if (!values.deliveryConsent) errors.deliveryConsent = 'Confirme a forma de entrega para continuar.';
    setError(null);setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if(first){form.elements.namedItem(first)?.focus();return;}
    lock.current=true;setBusy(true);
    try {
      sessionStorage.setItem('azulskye-checkout-attempt', token);
      localStorage.setItem('azulskye-last-payment-attempt',token);
      const result = await request('checkout',{
        items:official.items.map(({id,quantity})=>({id,quantity})),
        expectedAmount:Math.round(total*100),accessToken:token,customer,delivery:config.deliveryMode
      });
      localStorage.setItem('azulskye-payment-'+result.id,token);
      sessionStorage.removeItem('azulskye-checkout-attempt');
      window.location.assign(result.url);
    } catch(err) {
      if(fields.some(f=>f.name===err.field)){
        setFieldErrors({[err.field]:err.message});form.elements.namedItem(err.field)?.focus();
      } else setError(err);
      lock.current=false;setBusy(false);
    }
  }
  const pickupMode=config?.deliveryMode==='pickup';
  return <section className="ck-page wrap">
    <a className="ck-back" href="#/sacola"><ArrowLeft size={16}/>Voltar à sacola</a>
    <header className="ck-head"><h1>Finalizar compra</h1><span><LockKeyhole size={15}/> Checkout seguro</span></header>
    {!official || hasMarketplace ? <div className="ck-card"><h2>{hasMarketplace?'Revise sua sacola':'Sua sacola está vazia'}</h2><p>{hasMarketplace?'Combine a compra de anúncios do marketplace diretamente com o vendedor.':'Escolha um produto da loja oficial para continuar.'}</p><a className="btn btn-primary" href={hasMarketplace?'#/sacola':'#/catalogo'}>{hasMarketplace?'Revisar sacola':'Explorar produtos'}</a></div>:
    <div className="ck-layout">
      <CheckoutSummary group={official} config={config} total={total}/>
      <form className="ck-form" noValidate onSubmit={submit} onChange={e=>{
        const field=e.target.name;
        if(fieldErrors[field]) setFieldErrors(prev=>({...prev,[field]:undefined}));
      }}>
        <section className="ck-card"><div className="ck-title"><UserRound size={20}/><h2>Dados de contato</h2></div>
          {!user && <p>Compre como visitante ou <a href="#/entrar?voltar=%2Fcheckout">entre na sua conta</a>.</p>}
          <div className="ck-fields">{fields.map(({label,...props})=><label key={props.name}>{label}
          <input {...props} defaultValue={user?.[props.name] || ''} required aria-invalid={!!fieldErrors[props.name]} aria-describedby={fieldErrors[props.name]?'ck-error-'+props.name:undefined}/>
          {fieldErrors[props.name]&&<small id={'ck-error-'+props.name} role="alert">{fieldErrors[props.name]}</small>}
          </label>)}</div></section>
        {!config ? <p className="ck-card" role="status">Consultando formas de pagamento…</p> : !config.enabled ? <section className="ck-card"><p>O pagamento está indisponível no momento.</p><button type="button" className="text-link" onClick={loadConfig}>Tentar novamente</button></section>:
        <><section className="ck-card"><div className="ck-title"><MapPin size={20}/><h2>{pickupMode?'Retirada combinada':'Entrega'}</h2></div>
          <p>{pickupMode?pickup || 'A AzulSkye combinará os detalhes da retirada com você.':'Informe seu endereço na etapa de pagamento.'}</p>
          <label className="ck-consent"><input type="checkbox" name="deliveryConsent" required aria-invalid={!!fieldErrors.deliveryConsent} aria-describedby={fieldErrors.deliveryConsent?'ck-consent-error':undefined}/><span>{pickupMode?'Estou de acordo com a retirada, sem envio.':'Concordo com o frete informado.'}</span></label>
          {fieldErrors.deliveryConsent && <small className="ck-warning" id="ck-consent-error" role="alert">{fieldErrors.deliveryConsent}</small>}
        </section>
        <section className="ck-pay"><div className="ck-title"><CreditCard size={22}/><h2>Pagamento</h2></div>
          <p>Escolha Pix ou cartão na InfinitePay. As condições de parcelamento aparecem antes da confirmação.</p>
          {error && <div className="form-error" role="alert">{error.message}
          {error.newAttempt && <button type="button" className="text-link" onClick={()=>{sessionStorage.removeItem('azulskye-checkout-attempt');setToken(accessToken());setError(null);}}>Iniciar outro pedido</button>}</div>}
          <button className="btn btn-primary ck-submit" disabled={busy}>{busy?'Abrindo a InfinitePay…':'Ir para pagamento'} <ArrowRight size={18}/></button>
        </section></>}
      </form>
    </div>}
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
      <p>Os totais acima somam os pedidos confirmados pelo checkout. Consulte as taxas, o saldo e as datas de recebimento da sua conta na InfinitePay.</p>
      <a className="btn btn-outline" href="https://app.infinitepay.io/sales" target="_blank" rel="noreferrer">Ver vendas na InfinitePay</a>
    </div>
  </section>;
}
