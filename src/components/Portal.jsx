import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Plus, ArrowUpRight } from "lucide-react";
import { api, destination } from "../store.js";
import { money } from "../model.js";
import { SPECIALTIES, SERVICE_STATUSES } from "../workshops.js";
import { InfinitePayStatus } from "./InfinitePay.jsx";
import ProductForm from "./ProductForm.jsx";
const go = (path) => {
  location.hash = path;
};
const captions = {
  approved: "Publicado",
  rejected: "Recusado",
  pending: "Em análise",
  hidden: "Oculto",
  paid: "Pago",
  creating: "Em criação",
  review: "Verificar pagamento",
};
const paidLabel = (o) =>
  o.status === "paid"
    ? "Pago"
    : o.status === "pending"
      ? new Date(o.expires_at) < new Date()
        ? "Link expirado"
        : "Aguardando pagamento"
      : captions[o.status];
const date = (v) =>
  new Date(v).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
const formValues = (e) => Object.fromEntries(new FormData(e.currentTarget));
function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required {...props} />
    </label>
  );
}
function Multi({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea required rows={3} {...props} />
    </label>
  );
}
function Link({ to, children }) {
  return (
    <a className="btn btn-outline" href={"#" + to}>
      {children}
    </a>
  );
}
function Empty({ children }) {
  return <p className="live-empty">{children}</p>;
}
function Badge({ status }) {
  return (
    <span
      className={
        "tag tag-" +
        (["approved", "paid"].includes(status)
          ? "green"
          : status === "pending"
            ? "amber"
            : "neutral")
      }
    >
      {captions[status] || status}
    </span>
  );
}
function useCommand(refresh) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  async function run(work, success, after) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await work();
      if (after) after(result);
      if (refresh) await refresh();
      if (success) setMessage(success);
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const save = (action, body, success, after) =>
    run(() => api(action, body), success, after);
  return {
    run,
    save,
    busy,
    feedback: (
      <>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="settings-notice" role="status">
            {message}
          </p>
        )}
      </>
    ),
  };
}
export function Login({ refresh, account, next, initialMode }) {
  const [mode, setMode] = useState(
      initialMode === "recuperar" ? "recover" : "login",
    ),
    [recovery, setRecovery] = useState("");
  const { run, busy, feedback } = useCommand();
  async function submit(e) {
    e.preventDefault();
    const b = formValues(e);
    await run(async () => {
      const result = await api(mode, b);
      if (result.recovery) setRecovery(result.recovery);
      const me = await refresh();
      if (!result.recovery) go(next || destination(me.user));
    });
  }
  return (
    <section className="wrap portal auth-page">
      <div className="panel live-form">
        <span className="eyebrow">CONTA AZULSKYE</span>
        {recovery ? (
          <>
            <h1>Guarde seu código de recuperação</h1>
            <p>
              Ele permite trocar a senha se você perder o acesso. Guarde-o em um
              gerenciador de senhas.
            </p>
            <code className="recovery-code">{recovery}</code>
            <button
              className="btn btn-primary"
              onClick={() => go(next || destination(account?.user))}
            >
              Guardei meu código · continuar
            </button>
          </>
        ) : (
          <>
            <h1>
              {mode === "login"
                ? "Entrar na AzulSkye"
                : mode === "register"
                  ? "Crie sua conta"
                  : "Ativar ou recuperar acesso"}
            </h1>
            <form className="form-stack" onSubmit={submit} key={mode}>
              {mode === "register" && (
                <Field
                  name="name"
                  label="Seu nome"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              )}
              <Field
                label="E-mail de acesso"
                name="login"
                type="email"
                autoComplete="username"
                maxLength={254}
              />
              {mode === "recover" && (
                <Field
                  label="Código de ativação ou recuperação"
                  name="code"
                  autoComplete="off"
                />
              )}
              <Field
                label={
                  mode === "login"
                    ? "Senha"
                    : "Escolha uma senha de pelo menos 12 caracteres"
                }
                type="password"
                name="password"
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {feedback}
              <button className="btn btn-primary" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : mode === "login"
                    ? "Entrar"
                    : mode === "register"
                      ? "Criar conta"
                      : "Salvar nova senha"}
              </button>
            </form>
            <div className="live-actions">
              {[
                ["login", "Já tenho conta"],
                ["register", "Criar uma conta"],
                ["recover", "Ativar acesso ou recuperar senha"],
              ]
                .filter(([m]) => m !== mode)
                .map(([m, label]) => (
                  <button
                    key={m}
                    className="text-link"
                    onClick={() => setMode(m)}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function PartnerForm({ kind, profile, save }) {
  return (
    <form
      className="form-stack panel live-form"
      key={profile?.updated_at || kind}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        save(
          "partner",
          {
            ...Object.fromEntries(fd),
            kind,
            id: profile?.id,
            version: profile?.updated_at,
            specialties: fd.getAll("specialties"),
          },
          "Cadastro enviado para análise.",
        );
      }}
    >
      <h2>
        {kind === "seller"
          ? "Cadastro de vendedor"
          : "Cadastro de oficina parceira"}
      </h2>
      {profile && <Badge status={profile.status} />}
      <p>
        Após a aprovação, o nome, a cidade, a apresentação e o WhatsApp ficam
        visíveis na loja. Alterações no perfil passam por nova análise.
      </p>
      <Field
        label="Nome público"
        name="name"
        defaultValue={profile?.name}
        maxLength={100}
      />
      <div className="form-grid">
        <Field
          label="Cidade e estado"
          name="city"
          defaultValue={profile?.city}
          maxLength={100}
        />
        <Field
          label="WhatsApp comercial com DDD"
          type="tel"
          name="phone"
          defaultValue={profile?.phone}
        />
      </div>
      <label className="field">
        <span>Tipo de cadastro</span>
        <select name="person_type" defaultValue={profile?.person_type}>
          <option value="CPF">Pessoa física</option>
          <option value="CNPJ">Empresa</option>
        </select>
      </label>
      {kind === "workshop" && (
        <fieldset>
          <legend>Especialidades</legend>
          {SPECIALTIES.map((s) => (
            <label key={s} className="radio-label">
              <input
                type="checkbox"
                name="specialties"
                value={s}
                defaultChecked={profile?.specialties.includes(s)}
              />
              {s}
            </label>
          ))}
        </fieldset>
      )}
      <Multi
        label="Apresentação e serviços"
        name="description"
        defaultValue={profile?.description}
        maxLength={1500}
      />
      <button className="btn btn-primary">Enviar para análise</button>
    </form>
  );
}
export function Inquiry({ partner, product, user, refresh }) {
  const { save, busy, feedback } = useCommand(refresh);
  const [open, setOpen] = useState(false);
  const text = product
    ? "Olá, tenho interesse em " + product.name + " na AzulSkye."
    : "Olá, encontrei sua oficina na AzulSkye.";
  return (
    <div className="inquiry">
      <div className="live-actions">
        {partner?.phone && (
          <a
            className="btn btn-primary"
            target="_blank"
            rel="noreferrer"
            href={
              "https://wa.me/" +
              partner.phone +
              "?text=" +
              encodeURIComponent(text)
            }
          >
            Conversar no WhatsApp <ArrowUpRight size={16} />
          </a>
        )}
        <button className="btn btn-outline" onClick={() => setOpen(!open)}>
          {!partner
            ? "Consultar a loja oficial"
            : product
              ? "Enviar interesse pelo site"
              : "Solicitar orçamento"}
        </button>
      </div>
      {open &&
        (user ? (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save(
                "request",
                {
                  ...formValues(e),
                  partner_id: partner?.id,
                  product_id: product?.id,
                },
                "Solicitação enviada. Acompanhe em Minha conta.",
                () => setOpen(false),
              );
            }}
          >
            <Field
              label="Equipamento / modelo"
              name="equipment"
              defaultValue={product?.name}
              maxLength={140}
            />
            <Field
              label="Seu telefone de contato com DDD"
              name="phone"
              type="tel"
            />
            <Multi
              label="Mensagem para o parceiro"
              name="message"
              maxLength={1500}
            />
            <button disabled={busy} className="btn btn-primary">
              Enviar solicitação
            </button>
          </form>
        ) : (
          <Link
            to={
              "/entrar?voltar=" +
              encodeURIComponent(location.hash.slice(1) || location.pathname)
            }
          >
            Entrar para enviar a solicitação
          </Link>
        ))}
      {feedback}
    </div>
  );
}
export function Workshops({ shops, user, refresh }) {
  const [filter, setFilter] = useState("");
  const list = shops.filter((p) =>
    [p.name, p.city, ...p.specialties]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(filter.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="wrap portal">
      <span className="eyebrow">OFICINAS PARCEIRAS</span>
      <h1>Encontre uma oficina</h1>
      <div className="live-actions">
        <Field
          label="Buscar por nome, cidade ou serviço"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Link to="/ser-oficina">Cadastrar oficina</Link>
      </div>
      {list.map((p) => (
        <article className="panel live-form" key={p.id}>
          <h2>{p.name}</h2>
          <p>
            {p.city} · {p.specialties.join(", ")}
          </p>
          <p>{p.description}</p>
          <Inquiry partner={p} user={user} refresh={refresh} />
        </article>
      ))}
      {!list.length && (
        <Empty>
          {shops.length
            ? "Nenhuma oficina encontrada."
            : "As oficinas aparecerão aqui após aprovação da AzulSkye."}
        </Empty>
      )}
    </section>
  );
}
function Products({ products, save, partner, admin }) {
  const [q, setQ] = useState(""),
    [edit, setEdit] = useState(null),
    [filter, setFilter] = useState("all"),
    [limit, setLimit] = useState(30);
  const list = products.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (p.name + " " + p.sku).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="live-actions">
        <button className="btn btn-primary" onClick={() => setEdit({})}>
          <Plus size={17} />
          Novo produto
        </button>
        <input
          aria-label="Buscar produtos"
          placeholder="Buscar nome ou SKU"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filtrar situação"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            ["all", "Todas as situações"],
            ...["approved", "pending", "rejected", "hidden"].map((s) => [
              s,
              captions[s],
            ]),
          ].map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {edit && (
        <section className="panel live-form">
          <div className="live-heading">
            <h2>{edit.id ? "Editar produto" : "Novo produto"}</h2>
            <button className="text-link" onClick={() => setEdit(null)}>
              Fechar
            </button>
          </div>
          <ProductForm
            key={edit.id || "new"}
            product={edit.id ? edit : null}
            onSubmit={(product) =>
              save(
                "product",
                {
                  product,
                  id: edit.id,
                  version: edit.updated_at,
                  partner_id: partner?.id,
                },
                admin ? "Produto salvo." : "Anúncio enviado para análise.",
                () => setEdit(null),
              )
            }
          />
        </section>
      )}
      <p>{list.length} produtos</p>
      {list.slice(0, limit).map((p) => (
        <article className="live-row" key={p.id}>
          <img className="live-thumb" src={p.image} alt="" />
          <div className="live-grow">
            <strong>{p.name}</strong>
            <small>
              {p.seller} · {money(p.price)} · <Badge status={p.status} />
            </small>
          </div>
          <div className="live-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                setEdit(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Editar
            </button>
            {(p.status === "approved"
              ? ["hidden"]
              : admin
                ? p.status === "pending"
                  ? ["approved", "rejected"]
                  : ["approved"]
                : p.status !== "pending"
                  ? ["pending"]
                  : ["hidden"]
            ).map((s) => (
              <button
                key={s}
                className="btn btn-outline"
                onClick={() =>
                  save(
                    "product-status",
                    { id: p.id, version: p.updated_at, status: s },
                    "Situação do produto atualizada.",
                  )
                }
              >
                {
                  {
                    hidden: "Retirar",
                    approved: "Publicar",
                    rejected: "Recusar",
                    pending: "Pedir publicação",
                  }[s]
                }
              </button>
            ))}
          </div>
        </article>
      ))}
      {list.length > limit && (
        <button
          className="btn btn-outline"
          onClick={() => setLimit(limit + 30)}
        >
          Ver mais produtos
        </button>
      )}
    </>
  );
}
function Orders({ orders, save, admin }) {
  return (
    <>
      {!orders.length && (
        <Empty>
          Os pedidos aparecerão aqui quando uma compra for iniciada.
        </Empty>
      )}
      {orders.map((o) => (
        <details className="live-record" key={o.id}>
          <summary>
            <strong>{money(o.amount / 100)}</strong>
            <span>
              {paidLabel(o)} · {date(o.created_at)}
            </span>
          </summary>
          <p>Pedido {o.id}</p>
          <p>
            {o.customer.name} · {o.customer.email} · {o.customer.phone_number}
          </p>
          {o.items.map((i) => (
            <div className="checkout-seller" key={i.id}>
              <span>
                {i.quantity} × {i.description}
              </span>
              <strong>{money((i.price * i.quantity) / 100)}</strong>
            </div>
          ))}
          {o.status === "paid" && (
            <>
              <p>
                {o.capture_method === "pix" ? "Pix" : "Cartão"} ·{" "}
                {o.fulfillment}
              </p>
              {admin && o.fulfillment !== "Retirado" && (
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    save(
                      "fulfill",
                      {
                        id: o.id,
                        status:
                          o.fulfillment === "A preparar"
                            ? "Pronto para retirada"
                            : "Retirado",
                      },
                      "Etapa da retirada atualizada.",
                    )
                  }
                >
                  {o.fulfillment === "A preparar"
                    ? "Marcar pronto para retirada"
                    : "Confirmar retirada"}
                </button>
              )}
            </>
          )}
        </details>
      ))}
    </>
  );
}
function Requests({ requests, save, manage }) {
  return (
    <>
      {!requests.length && <Empty>Nenhuma solicitação por enquanto.</Empty>}
      {requests.map((r) => (
        <details className="live-record" key={r.id}>
          <summary>
            <strong>{r.equipment}</strong>
            <span>
              {r.status} · {date(r.created_at)}
            </span>
          </summary>
          <p>
            {r.store_partners?.name || "Loja oficial AzulSkye"} · {r.name} ·{" "}
            <a
              href={"https://wa.me/" + r.phone}
              target="_blank"
              rel="noreferrer"
            >
              {r.phone}
            </a>
          </p>
          <p>{r.message}</p>
          {r.reply && (
            <p>
              <strong>Resposta do parceiro</strong>
              <br />
              {r.reply}
            </p>
          )}
          {manage && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                save(
                  "reply",
                  { id: r.id, ...formValues(e) },
                  "Atendimento atualizado.",
                );
              }}
            >
              <label className="field">
                <span>Situação</span>
                <select name="status" defaultValue={r.status}>
                  {(r.store_partners?.kind !== "workshop"
                    ? ["Recebida", "Em negociação", "Concluída", "Cancelada"]
                    : SERVICE_STATUSES
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <Multi
                label="Resposta ao cliente"
                name="reply"
                defaultValue={r.reply}
                maxLength={1500}
                required={false}
              />
              <button className="btn btn-primary">Salvar atendimento</button>
            </form>
          )}
        </details>
      ))}
    </>
  );
}
function Partners({ partners, save }) {
  return (
    <>
      {!partners.length && <Empty>Nenhum cadastro recebido.</Empty>}
      {partners.map((p) => (
        <article className="live-record" key={p.id}>
          <h3>{p.name}</h3>
          <Badge status={p.status} />
          <p>
            {p.city} · {p.person_type} · {p.phone}
          </p>
          <p>{p.description}</p>
          {p.specialties?.length > 0 && <p>{p.specialties.join(", ")}</p>}
          <div className="live-actions">
            {["approved", "rejected"]
              .filter((s) => s !== p.status)
              .map((s) => (
                <button
                  className="btn btn-outline"
                  key={s}
                  onClick={() =>
                    save(
                      "partner-status",
                      { id: p.id, status: s, version: p.updated_at },
                      "Decisão registrada.",
                    )
                  }
                >
                  {s === "approved"
                    ? "Aprovar"
                    : p.status === "approved"
                      ? "Suspender"
                      : "Recusar"}
                </button>
              ))}
          </div>
        </article>
      ))}
    </>
  );
}
function PushSettings({ run }) {
  const [sub, setSub] = useState(null);
  useEffect(() => {
    navigator.serviceWorker
      ?.getRegistration()
      .then((r) => r?.pushManager?.getSubscription())
      .then(setSub)
      .catch(() => {});
  }, []);
  async function toggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window))
      throw Error(
        "Use um navegador com notificações. No iPhone, abra o app pela tela de início.",
      );
    if (sub) {
      await api("unpush", { endpoint: sub.endpoint });
      await sub.unsubscribe();
      setSub(null);
      return;
    }
    if ((await Notification.requestPermission()) !== "granted")
      throw Error("Permita notificações nas configurações deste site.");
    const sw = await navigator.serviceWorker.ready;
    const { key } = await api("push-key", {});
    const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    });
    try {
      await api("push", { subscription: subscription.toJSON() });
      setSub(subscription);
    } catch (err) {
      await subscription.unsubscribe();
      throw err;
    }
  }
  return (
    <button
      className="btn btn-outline"
      onClick={() =>
        run(
          toggle,
          sub
            ? "Avisos desativados."
            : "Avisos de vendas ativados neste aparelho.",
        )
      }
    >
      <Bell size={17} />
      {sub
        ? "Desativar alertas neste aparelho"
        : "Receber notificações de vendas"}
    </button>
  );
}
const menus = {
  admin: [
    ["visao-geral", "Visão geral"],
    ["pedidos", "Pedidos"],
    ["produtos", "Produtos"],
    ["vendedores", "Vendedores"],
    ["oficinas", "Oficinas"],
    ["solicitacoes", "Atendimentos"],
    ["financeiro", "Financeiro"],
    ["configuracoes", "Configurações"],
  ],
  seller: [
    ["visao-geral", "Visão geral"],
    ["produtos", "Meus anúncios"],
    ["pedidos", "Contatos recebidos"],
    ["financeiro", "Negociações"],
    ["configuracoes", "Meu perfil"],
  ],
  workshop: [
    ["visao-geral", "Visão geral"],
    ["perfil", "Meu perfil"],
    ["solicitacoes", "Solicitações"],
  ],
  client: [["visao-geral", "Minha conta"]],
};
const paths = {
  admin: "admin",
  seller: "vendedor",
  workshop: "oficina",
  client: "conta",
};
function LoginRedirect({ route }) {
  useEffect(() => {
    go("/entrar?voltar=" + encodeURIComponent(route));
  }, [route]);
  return (
    <section className="wrap portal" role="status">
      Abrindo acesso à conta…
    </section>
  );
}
export function Portal({ page, role, store, route, openInstall }) {
  const { refresh, account } = store,
    user = account?.user;
  const { save, run, busy, feedback } = useCommand(refresh);
  const [days, setDays] = useState(30);
  const query = new URLSearchParams(route.split("?")[1] || "");
  const ret = query.get("voltar"),
    next = ret && /^\/(?!\/)/.test(ret) ? ret : null;
  if (page === "/entrar")
    return (
      <Login
        refresh={refresh}
        account={account}
        next={next}
        initialMode={query.get("modo")}
      />
    );
  if (!user) return <LoginRedirect route={route} />;
  const own = account.own;
  if (page === "/vender" || page === "/ser-oficina") {
    const kind = page === "/vender" ? "seller" : "workshop";
    return (
      <section className="wrap portal">
        {feedback}
        <fieldset disabled={busy}>
          <PartnerForm
            kind={kind}
            profile={own.find((p) => p.kind === kind)}
            save={save}
          />
        </fieldset>
        <Link to="/conta">Minha conta</Link>
      </section>
    );
  }
  const view = page === "/conta" ? "client" : role || user.role;
  const partner = own.find((p) => p.kind === view && p.status === "approved");
  if (
    (view === "admin" && user.role !== "admin") ||
    (["seller", "workshop"].includes(view) && !partner)
  )
    return (
      <section className="wrap portal">
        <h1>Acesso restrito</h1>
        <p>
          {view === "admin"
            ? "Esta área requer uma conta administradora."
            : "Seu cadastro precisa de aprovação para acessar este painel."}
        </p>
        <div className="live-actions">
          <Link to="/conta">Minha conta</Link>
          {view !== "admin" && (
            <Link to={view === "seller" ? "/vender" : "/ser-oficina"}>
              Ver cadastro
            </Link>
          )}
        </div>
      </section>
    );
  const admin = view === "admin",
    client = view === "client",
    seller = view === "seller",
    tab = page.split("/")[2] || "visao-geral",
    menu = menus[view];
  const orders = account.orders,
    paid = orders.filter(
      (o) =>
        o.status === "paid" &&
        (!days ||
          new Date(o.paid_at).getTime() >= Date.now() - days * 86400000),
    );
  const requests = account.requests.filter((r) =>
    admin || client
      ? r.account_id === user.id || admin
      : r.partner_id === partner?.id,
  );
  const listings = account.products.filter(
    (p) => admin || p.sellerId === partner?.id,
  );
  const title = menu.find((m) => m[0] === tab)?.[1];
  return (
    <section className="wrap portal">
      <header className="live-heading">
        <div>
          <span className="eyebrow">
            {admin
              ? "ADMINISTRAÇÃO"
              : seller
                ? "MARKETPLACE"
                : client
                  ? "CONTA AZULSKYE"
                  : "OFICINA PARCEIRA"}
          </span>
          <h1>{title || "Página não encontrada"}</h1>
          <p>{partner?.name || user.name}</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() =>
            run(async () => {
              await api("logout", {});
              await refresh();
              go("/");
            })
          }
        >
          <LogOut size={15} />
          Sair
        </button>
      </header>
      <nav className="portal-tabs" aria-label="Menu do painel">
        {menu.map(([k, label]) => (
          <a
            key={k}
            className={k === tab ? "active" : ""}
            href={"#/" + paths[view] + (client ? "" : "/" + k)}
          >
            {label}
          </a>
        ))}
        {!client && <a href="#/conta">Minha conta</a>}
      </nav>
      {admin && ["visao-geral", "financeiro"].includes(tab) && (
        <div className="live-actions">
          <label>
            Período de vendas{" "}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[
                [7, "Últimos 7 dias"],
                [30, "Últimos 30 dias"],
                [90, "Últimos 90 dias"],
                [0, "Todo o período"],
              ].map(([n, label]) => (
                <option key={n} value={n}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {feedback}
      <fieldset className="live-controls" disabled={busy}>
        {tab === "visao-geral" && (
          <>
            {admin ? (
              <>
                <div className="live-metrics">
                  <Metric
                    title="Vendas confirmadas"
                    value={money(paid.reduce((s, o) => s + o.amount, 0) / 100)}
                  />
                  <Metric title="Pedidos pagos" value={paid.length} />
                  <Metric
                    title="Parceiros em análise"
                    value={
                      account.partners.filter((p) => p.status === "pending")
                        .length
                    }
                  />
                  <Metric
                    title="Anúncios em análise"
                    value={
                      listings.filter((p) => p.status === "pending").length
                    }
                  />
                </div>
                <PushSettings run={run} />
                <h2>Pedidos recentes</h2>
                <Orders orders={orders.slice(0, 8)} admin save={save} />
              </>
            ) : client ? (
              <>
                <div className="live-actions">
                  {user.role === "admin" && (
                    <Link to="/admin">Abrir administração</Link>
                  )}
                  {[
                    ["seller", "/vendedor", "/vender", "Vendedor"],
                    ["workshop", "/oficina", "/ser-oficina", "Oficina"],
                  ].map(([k, url, form, label]) => (
                    <Link
                      key={k}
                      to={
                        own.find((p) => p.kind === k)?.status === "approved"
                          ? url
                          : form
                      }
                    >
                      {label}
                      {own.find((p) => p.kind === k)?.status === "pending"
                        ? " · em análise"
                        : ""}
                    </Link>
                  ))}
                  <Link to="/favoritos">Favoritos</Link>
                </div>
                <h2>Meus pedidos na loja oficial</h2>
                <Orders
                  orders={orders.filter((o) => o.buyer_id === user.id)}
                  save={save}
                />
                <h2>Minhas solicitações</h2>
                <Requests requests={requests} save={save} />
              </>
            ) : (
              <>
                <div className="live-metrics">
                  <Metric
                    title="Solicitações recebidas"
                    value={requests.length}
                  />
                  {seller && (
                    <Metric
                      title="Anúncios publicados"
                      value={
                        listings.filter((p) => p.status === "approved").length
                      }
                    />
                  )}
                </div>
                <h2>Últimas solicitações</h2>
                <Requests requests={requests.slice(0, 8)} manage save={save} />
              </>
            )}
          </>
        )}
        {tab === "produtos" && (admin || seller) && (
          <Products
            products={listings}
            partner={partner}
            admin={admin}
            save={save}
          />
        )}
        {tab === "pedidos" &&
          (admin ? (
            <Orders orders={orders} admin save={save} />
          ) : (
            seller && <Requests requests={requests} manage save={save} />
          ))}
        {tab === "solicitacoes" && (
          <Requests requests={requests} manage save={save} />
        )}
        {admin && ["oficinas", "vendedores"].includes(tab) && (
          <Partners
            partners={account.partners.filter(
              (p) => p.kind === (tab === "oficinas" ? "workshop" : "seller"),
            )}
            save={save}
          />
        )}
        {tab === "financeiro" &&
          (admin ? (
            <>
              <div className="live-metrics">
                {[
                  ["pix", "Pix"],
                  ["credit_card", "Cartão"],
                ].map(([k, label]) => (
                  <Metric
                    key={k}
                    title={"Vendas por " + label}
                    value={money(
                      paid
                        .filter((o) => o.capture_method === k)
                        .reduce((s, o) => s + o.amount, 0) / 100,
                    )}
                  />
                ))}
              </div>
              <InfinitePayStatus />
            </>
          ) : (
            seller && (
              <>
                <p>
                  Os compradores negociam e pagam diretamente ao vendedor.
                  Registre o andamento dos contatos em seu painel.
                </p>
                <Requests requests={requests} manage save={save} />
              </>
            )
          ))}
        {admin && tab === "configuracoes" && (
          <div className="panel live-form">
            <h2>Retirada na loja oficial</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                save(
                  "settings",
                  formValues(e),
                  "Instruções de retirada publicadas.",
                );
              }}
            >
              <Multi
                label="Instruções para o comprador"
                name="pickup"
                defaultValue={account.settings.pickup}
                maxLength={1000}
              />
              <button className="btn btn-primary">Salvar instruções</button>
            </form>
            <PushSettings run={run} />
            <button className="btn btn-outline" onClick={openInstall}>
              Adicionar à tela inicial
            </button>
          </div>
        )}
        {partner && ["configuracoes", "perfil"].includes(tab) && (
          <PartnerForm kind={view} profile={partner} save={save} />
        )}
      </fieldset>
    </section>
  );
}
function Metric({ title, value }) {
  return (
    <div className="panel live-metric">
      <small>{title}</small>
      <strong>{value}</strong>
    </div>
  );
}
