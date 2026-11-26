import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CardPayment,
  StatusScreen,
  initMercadoPago,
} from "@mercadopago/sdk-react";
import {
  ArrowLeft,
  CreditCard,
  LockKeyhole,
  MapPin,
  QrCode,
  UserRound,
} from "lucide-react";
import { checkoutContact } from "../checkout-contact.js";
import { money, orderGroups } from "../model.js";
import CheckoutSummary from "./CheckoutSummary.jsx";
import "../checkout.css";

async function request(action, body, token) {
  const response = await fetch(
    "/api/mercadopago?action=" + action,
    body
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Pagamento indisponível. Tente novamente.");
  return data;
}
const attemptKey = "azul-mp-attempt";
const makeToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
let latestResponse;
async function attemptFor(order) {
  const encoded = new TextEncoder().encode(
    JSON.stringify([order.customer.email, order.expectedAmount, order.items]),
  );
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoded)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  const key = "azul-mp-cart-" + hash;
  const token = sessionStorage.getItem(key) || makeToken();
  sessionStorage.setItem(key, token);
  sessionStorage.setItem("azul-mp-cart-for-" + token, key);
  sessionStorage.setItem(attemptKey, token);
  return token;
}
const fields = [
  ["name", "Nome completo", "name", "text"],
  ["email", "E-mail", "email", "email"],
  ["phone", "Telefone com DDD", "tel", "tel"],
];
const cardStyle = {
  paymentMethods: { types: { included: ["credit_card"] } },
  visual: { hideFormTitle: true },
};
function useConfig() {
  const [config, setConfig] = useState(null);
  const load = useCallback(() => {
    setConfig(null);
    request("config")
      .then((c) => {
        if (c.publicKey) initMercadoPago(c.publicKey, { locale: "pt-BR" });
        setConfig(c);
      })
      .catch(() => setConfig({ enabled: false }));
  }, []);
  useEffect(load, [load]);
  return [config, load];
}
function Methods({ config, order, edit }) {
  const [method, setMethod] = useState(config.pix ? "pix" : "card");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const init = useMemo(
    () => ({
      amount: order.expectedAmount / 100,
      payer: { email: order.customer.email },
    }),
    [order],
  );
  const onReady = useCallback(() => {
    setReady(true);
    setError("");
  }, []);
  const onError = useCallback((e) => {
    if (e?.type === "critical")
      setError("O formulário de cartão não carregou. Tente abrir novamente.");
  }, []);
  useEffect(() => {
    if (method !== "card" || ready) return;
    const timer = setTimeout(
      () =>
        setError(
          "O formulário de cartão demorou para carregar. Tente abrir novamente.",
        ),
      30000,
    );
    return () => clearTimeout(timer);
  }, [method, ready, retry]);
  const pay = useCallback(
    async (form) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        const token = await attemptFor(order);
        const result = await request("pay", { ...order, form }, token);
        latestResponse = result;
        localStorage.setItem("azul-mp-" + result.id, token);
        // Only the order reference goes in the URL. QR and card tokens are never persisted.
        location.hash = "/pagamento-mp?order=" + encodeURIComponent(result.id);
      } catch (e) {
        setError(e.message);
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [order],
  );
  return (
    <section className="ck-form ck-card">
      <div className="ck-summary-title">
        <CreditCard size={21} />
        <h2>Como prefere pagar?</h2>
        <button className="text-link" disabled={busy} onClick={edit}>
          Editar contato
        </button>
      </div>
      <div className="mp-methods">
        {config.pix && (
          <button
            disabled={busy}
            aria-pressed={method === "pix"}
            onClick={() => {
              setMethod("pix");
              setError("");
            }}
          >
            <QrCode size={20} />
            Pix
          </button>
        )}
        {config.card && (
          <button
            disabled={busy}
            aria-pressed={method === "card"}
            onClick={() => {
              setMethod("card");
              setError("");
              setReady(false);
              setRetry((r) => r + 1);
            }}
          >
            <CreditCard size={20} />
            Cartão de crédito
          </button>
        )}
      </div>
      {method === "pix" ? (
        <form
          className="ck-fields mp-pix-form"
          onSubmit={(e) => {
            e.preventDefault();
            const doc = e.currentTarget.elements.doc.value.replace(/\D/g, "");
            if (![11, 14].includes(doc.length)) {
              setError("Confira os dígitos do CPF ou CNPJ do pagador.");
              return;
            }
            pay({
              payment_method_id: "pix",
              payer: {
                identification: {
                  number: doc,
                  type: doc.length === 11 ? "CPF" : "CNPJ",
                },
              },
            });
          }}
        >
          <label>
            CPF ou CNPJ do pagador
            <input
              name="doc"
              inputMode="numeric"
              autoComplete="off"
              required
              maxLength={18}
            />
          </label>
          <button className="btn btn-primary ck-submit" disabled={busy}>
            {busy
              ? "Gerando Pix…"
              : "Gerar Pix de " + money(order.expectedAmount / 100)}
          </button>
        </form>
      ) : (
        <div>
          {!ready && (
            <p role="status">Carregando os campos seguros do cartão…</p>
          )}
          <CardPayment
            key={retry}
            initialization={init}
            customization={cardStyle}
            onSubmit={pay}
            onReady={onReady}
            onError={onError}
          />
          {error && !ready && (
            <button
              className="text-link"
              onClick={() => {
                setError("");
                setRetry((r) => r + 1);
              }}
            >
              Recarregar cartão
            </button>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="form-error">
          {error}{" "}
          {sessionStorage.getItem(attemptKey) && (
            <a href="#/pagamento-mp">Consultar minha tentativa</a>
          )}
        </div>
      )}
    </section>
  );
}
export function MercadoCheckout({ cart, products, user, pickup }) {
  const [config, reload] = useConfig();
  const [order, setOrder] = useState(null);
  const [errors, setErrors] = useState({});
  const [defaults, setDefaults] = useState(user || {});
  const groups = orderGroups(cart, products);
  const official = groups.find((g) => g.sellerId === "official");
  const mixed = groups.some((g) => g.sellerId !== "official");
  const items = official?.items.map(({ id, quantity }) => ({ id, quantity }));
  const total = official?.total || 0;
  const amount = Math.round(total * 100);
  const current =
    order &&
    amount === order.expectedAmount &&
    JSON.stringify(items) === JSON.stringify(order.items);
  function next(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const { customer, errors } = checkoutContact(
      Object.fromEntries(new FormData(form)),
    );
    if (!form.elements.pickup.checked)
      errors.pickup = "Confirme a retirada para continuar.";
    setErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      form.elements[first].focus();
      return;
    }
    setDefaults(customer);
    setOrder({ items, expectedAmount: amount, customer, delivery: "pickup" });
  }
  return (
    <section className="ck-page wrap">
      <a href="#/sacola" className="ck-back">
        <ArrowLeft size={16} />
        Voltar à sacola
      </a>
      <header className="ck-head">
        <h1>Finalizar compra</h1>
        <span>
          <LockKeyhole size={15} />
          Mercado Pago
        </span>
      </header>
      {!official || mixed ? (
        <div className="ck-card">
          <p>
            {mixed
              ? "Combine os anúncios do marketplace diretamente com o vendedor."
              : "Sua sacola está vazia."}
          </p>
          <a href="#/catalogo">Ver catálogo</a>
        </div>
      ) : (
        <div className="ck-layout">
          <CheckoutSummary group={official} config={config} total={total} />
          {current && config?.enabled ? (
            <Methods
              config={config}
              order={order}
              edit={() => setOrder(null)}
            />
          ) : (
            <form className="ck-form" noValidate onSubmit={next}>
              <section className="ck-card">
                <div className="ck-title">
                  <UserRound size={20} />
                  <h2>Dados de contato</h2>
                </div>
                <div className="ck-fields">
                  {fields.map(([name, label, autoComplete, type]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        type={type}
                        autoComplete={autoComplete}
                        defaultValue={defaults[name] || ""}
                        required
                        aria-invalid={!!errors[name]}
                      />
                      {errors[name] && (
                        <small role="alert">{errors[name]}</small>
                      )}
                    </label>
                  ))}
                </div>
              </section>
              <section className="ck-card">
                <div className="ck-title">
                  <MapPin size={20} />
                  <h2>Retirada combinada</h2>
                </div>
                <p>
                  {pickup ||
                    "A AzulSkye entrará em contato para combinar a retirada."}
                </p>
                <label className="ck-consent">
                  <input
                    name="pickup"
                    type="checkbox"
                    defaultChecked={!!order}
                  />
                  Concordo com a retirada, sem envio.
                </label>
                {errors.pickup && (
                  <small className="ck-warning" role="alert">
                    {errors.pickup}
                  </small>
                )}
              </section>
              {config?.enabled ? (
                <button className="btn btn-primary ck-submit">
                  Escolher forma de pagamento
                </button>
              ) : (
                <div role="status" className="ck-card">
                  {config
                    ? "Pagamento indisponível no momento."
                    : "Consultando meios de pagamento…"}{" "}
                  {config && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={reload}
                    >
                      Consultar novamente
                    </button>
                  )}
                </div>
              )}
              {sessionStorage.getItem(attemptKey) && (
                <a className="text-link" href="#/pagamento-mp">
                  Acompanhar pagamento anterior
                </a>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
const titles = {
  paid: "Pagamento confirmado",
  pending: "Aguardando pagamento",
  creating: "Consultando a cobrança",
  review: "Pagamento em verificação",
  declined: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  refunded: "Pagamento estornado",
  partial_refund: "Estorno parcial",
  disputed: "Pagamento em contestação",
  missing: "Nenhuma cobrança encontrada",
};
export function MercadoReceipt({ onPaid }) {
  const [config] = useConfig();
  const id = new URLSearchParams(location.hash.split("?")[1]).get("order");
  const [data, setData] = useState(() =>
    id && latestResponse?.id === id ? latestResponse : null,
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const paidCallback = useRef(onPaid);
  paidCallback.current = onPaid;
  const lock = useRef(false);
  const token = useMemo(
    () =>
      (id && localStorage.getItem("azul-mp-" + id)) ||
      sessionStorage.getItem(attemptKey),
    [id],
  );
  const check = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!token)
        throw new Error("Abra o pedido no navegador usado para a compra.");
      const row = await request("status", {}, token);
      if (id && row.id !== id)
        throw new Error("Pedido indisponível neste navegador.");
      if (row.id) localStorage.setItem("azul-mp-" + row.id, token);
      setData(row);
      setError("");
      if (
        row.status === "paid" &&
        !localStorage.getItem("azul-mp-applied-" + row.id)
      ) {
        paidCallback.current(row.items);
        localStorage.setItem("azul-mp-applied-" + row.id, "1");
      }
      if (
        [
          "paid",
          "cancelled",
          "declined",
          "refunded",
          "partial_refund",
          "disputed",
        ].includes(row.status)
      ) {
        const key = sessionStorage.getItem("azul-mp-cart-for-" + token);
        if (key && sessionStorage.getItem(key) === token)
          sessionStorage.removeItem(key);
        sessionStorage.removeItem("azul-mp-cart-for-" + token);
        if (sessionStorage.getItem(attemptKey) === token)
          sessionStorage.removeItem(attemptKey);
        latestResponse = null;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [id, token]);
  useEffect(() => {
    check();
  }, [check]);
  useEffect(() => {
    if (!data || !["pending", "creating", "review"].includes(data.status))
      return;
    const timer = setInterval(() => {
      if (!document.hidden) check();
    }, 8500);
    return () => clearInterval(timer);
  }, [data?.status, check]);
  const challenge = useMemo(
    () =>
      data?.challenge
        ? { paymentId: data.paymentId, additionalInfo: data.challenge }
        : null,
    [data?.paymentId, data?.challenge?.creq],
  );
  return (
    <section className="ck-page wrap mp-receipt">
      <div className="ck-card">
        <h1>{titles[data?.status] || "Consultar pagamento"}</h1>
        {data?.id && (
          <p>
            Pedido {data.id}
            <br />
            <strong>{money(data.amount / 100)}</strong>
          </p>
        )}
        {data?.pix && (
          <>
            <p>
              Escaneie o QR Code ou copie o código para pagar no aplicativo do
              seu banco.
            </p>
            {data.pix.image && (
              <img
                className="mp-qr"
                alt="QR Code para pagamento por Pix"
                src={"data:image/png;base64," + data.pix.image}
              />
            )}
            <label className="mp-code">
              Pix copia e cola
              <input
                readOnly
                value={data.pix.code}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.pix.code);
                  setCopied(true);
                } catch {
                  setError("Selecione e copie o código no campo acima.");
                }
              }}
            >
              {copied ? "Código copiado" : "Copiar código Pix"}
            </button>
            {data.pix.expires && (
              <p>
                Validade do Pix até{" "}
                {new Date(data.pix.expires).toLocaleString("pt-BR")}.
              </p>
            )}
          </>
        )}
        {challenge && config?.publicKey && (
          <StatusScreen initialization={challenge} />
        )}
        {data?.status === "paid" && (
          <p>A AzulSkye combinará a retirada com você.</p>
        )}
        {["creating", "review"].includes(data?.status) && (
          <p>
            Estamos verificando sua tentativa com o Mercado Pago. Aguarde a
            confirmação antes de tentar pagar novamente.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="button-row">
          <button className="btn btn-outline" disabled={busy} onClick={check}>
            {busy ? "Consultando…" : "Atualizar situação"}
          </button>
          {["missing", "declined", "cancelled"].includes(data?.status) ? (
            <a className="btn btn-primary" href="#/checkout">
              Voltar ao checkout
            </a>
          ) : (
            <a className="text-link" href="#/catalogo">
              Voltar ao catálogo
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
export function MercadoStatus() {
  const [config] = useConfig();
  return (
    <section className="panel integration-card">
      <CreditCard size={30} />
      <div>
        <h2>Mercado Pago</h2>
        <p>
          {config
            ? config.enabled
              ? "Checkout ativo · " +
                [config.pix && "Pix", config.card && "Cartão"]
                  .filter(Boolean)
                  .join(" e ")
              : "Pagamento indisponível"
            : "Consultando conexão…"}
        </p>
        <a
          className="btn btn-outline"
          href="https://www.mercadopago.com.br/activities"
          target="_blank"
          rel="noreferrer"
        >
          Ver movimentações no Mercado Pago
        </a>
      </div>
    </section>
  );
}
