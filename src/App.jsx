import { InfinitePayCheckout, InfinitePayReturn } from "./components/InfinitePay.jsx";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  ShoppingBag,
  Heart,
  UserRound,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Truck,
  Package,
  Compass,
  Wind,
  Wrench,
  SlidersHorizontal,
  UsersRound,
  Store,
  Plus,
  Download,
  Smartphone,
  CheckCircle2,
  Trash2,
  Minus,
  CircleHelp,
  BadgeCheck
} from "lucide-react";
import "./portal.css";
import heProducts from "./data/he-products.json";
import ScreenDirectory from "./components/ScreenDirectory.jsx";
import {Portal, Workshops, Inquiry} from "./components/Portal.jsx";
import {api, useStore} from "./store.js";
import { resolveRoute } from "./routes.js";

import Brand from "./components/Brand.jsx";
import {
  GROUPS,
  filterProducts,
  groupOf,
  money,
  orderGroups
} from "./model.js";
const KEY = "azulskye-bag-v2";
const ROLE_NAMES = {
  client: "Cliente",
  seller: "Vendedor",
  admin: "Administrador",
  workshop: "Oficina parceira",
};
const initial=()=>{
  try {
    const saved=JSON.parse(localStorage.getItem(KEY) || "null") || JSON.parse(localStorage.getItem("azulskye-visual-v1") || "null")?.data;
    return {cart:(saved?.cart||[]).filter(l=>Number.isInteger(l.quantity)&&l.quantity>0),favorites:(saved?.favorites||[]).filter(id=>typeof id==="string")};
  } catch {return {cart:[],favorites:[]};}
};
const featuredIds = [
  ...heProducts.map((p) => p.id),
  "1955",
  "89",
  "1884",
  "817",
  "1963",
  "728",
  "1888",
  "899",
];
const categories = [
  { name: "Paramotores", caption: "Prontos para decolar", id: "1955" },
  { name: "Peças", caption: "Peças de reposição", id: "730" },
  { name: "Asas", caption: "Encontre seu horizonte", id: "817" },
  { name: "Hélices", caption: "Potência em movimento", id: "89" },
];
function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function Tag({ children, tone = "blue" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
function Empty({ icon: Icon = Package, title, text, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={30} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
function Dialog({ title, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    const cancel = (e) => {
      e.preventDefault();
      close();
    };
    el.addEventListener("cancel", cancel);
    return () => {
      el.removeEventListener("cancel", cancel);
      el.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Fechar janela" onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const store=useStore();
  const user=store.account?.user;
  const [local,setData]=useState(initial);
  const data={...local,favorites:user?store.account.favorites:local.favorites};
  const [route, setRoute] = useState(
    location.hash.slice(1) || location.pathname + location.search,
  );
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [gallerySelection, setGallerySelection] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [filters, setFilters] = useState({
    category: "Todos",
    source: "all",
    condition: "all",
    available: false,
    sort: "featured",
  });
  const toastTimer = useRef(null);
  const notify = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  };
  const update = (fn) =>
    setData((previous) =>
      typeof fn === "function" ? fn(previous) : { ...previous, ...fn },
    );
  useEffect(() => {
    try {
      localStorage.setItem(KEY,JSON.stringify(local));
    } catch {notify("Não foi possível salvar a sacola neste navegador.");}
  },[local]);
  useEffect(() => {
    const handler = () => {
      setRoute(location.hash.slice(1) || location.pathname + location.search);
      setMobileMenu(false);
      setVisibleCount(12);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const go = (path) => {
    location.hash = path;
  };
  const products=store.catalog?.products||[];
  const cartCount=orderGroups(data.cart,products).reduce((sum,g)=>sum+g.items.reduce((n,p)=>n+p.quantity,0),0);
  const { page, role: requestedRole } = resolveRoute(route);
  const params = new URLSearchParams(route.split("?")[1] || "");
  const dashboard = page.startsWith("/painel");
  const selected = products.find((p) => p.id === page.split("/")[2] && !["hidden", "rejected"].includes(p.status));
  const activeCategory = params.get("categoria") || filters.category;
  const activeQuery = params.get("q") || "";
  const activeFilters = {
    ...filters,
    brand: params.get("marca") || "all",
    category: activeCategory,
    query: activeQuery,
    source:
      page === "/marketplace"
        ? "marketplace"
        : params.get("origem") || filters.source,
  };
  const filtered = filterProducts(products, activeFilters);
  const featured = featuredIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  const addCart = (p) => {
    if(!p.official){go("/produto/"+p.id);return;}
    if (["hidden", "rejected"].includes(p.status) || !p.stock || p.price == null) return;
    if((data.cart.find(l=>l.id===p.id)?.quantity||0)>=Math.min(10,p.quantity??10)){notify("Quantidade máxima disponível para esta compra.");return;}
    update((d) => ({
      ...d,
      cart: d.cart.some((l) => l.id === p.id)
        ? d.cart.map((l) =>
            l.id === p.id ? { ...l, quantity: l.quantity + 1 } : l,
          )
        : [...d.cart, { id: p.id, quantity: 1 }],
    }));
    notify("Produto adicionado à sua sacola.");
  };
  const toggleFavorite=async id=>{
    if(user){
      try{await api("favorite",{id,selected:!data.favorites.includes(id)});await store.refresh();}
      catch(err){notify(err.message);}
    } else update(d=>({...d,favorites:d.favorites.includes(id)?d.favorites.filter(v=>v!==id):[...d.favorites,id]}));
  };
  const openInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted")
        notify("Instalação solicitada ao navegador.");
      setInstallPrompt(null);
    } else setModal({ type: "install" });
  };
  const card = (p) => (
    <article className="product-card" key={p.id}>
      <div className="product-image">
        <a href={`#/produto/${p.id}`} aria-label={`Ver ${p.name}`}>
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            width="500"
            height="500"
          />
        </a>
        <span className={`condition ${p.condition === "Usado" ? "used" : ""}`}>
          {p.condition}
        </span>
        <button
          className={`favorite ${data.favorites.includes(p.id) ? "selected" : ""}`}
          aria-label={`${data.favorites.includes(p.id) ? "Remover" : "Adicionar"} ${p.name} ${data.favorites.includes(p.id) ? "dos" : "aos"} favoritos`}
          aria-pressed={data.favorites.includes(p.id)}
          onClick={() => toggleFavorite(p.id)}
        >
          <Heart
            size={17}
            fill={data.favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="product-info">
        <div className="product-seller">
          {p.official ? (
            <>
              <BadgeCheck size={13} />{" "}
              {p.brand === "HE" ? "HE · LOJA OFICIAL" : "LOJA OFICIAL"}
            </>
          ) : (
            <>
              <Store size={13} /> {p.seller}
            </>
          )}
        </div>
        <a className="product-name" href={`#/produto/${p.id}`}>
          {p.name}
        </a>
        <div className="price-row">
          <strong>{money(p.price)}</strong>
          <button
            className="add-bag"
            aria-label={p.official?`Adicionar ${p.name} à sacola`:`Ver anúncio de ${p.name}`}
            disabled={!p.stock || p.price == null}
            onClick={() => addCart(p)}
          >
            <Plus size={19} />
          </button>
        </div>
        <span className={`stock ${!p.stock ? "unavailable" : ""}`}>
          {p.stock
            ? p.price == null
              ? "Consulte a disponibilidade"
              : p.availability === "order"
                ? "Sob encomenda"
                : "Disponível no catálogo"
            : "Indisponível no momento"}
        </span>
      </div>
    </article>
  );
  const submitSearch = (e) => {
    e.preventDefault();
    go(`/catalogo?q=${encodeURIComponent(search)}`);
  };
  const sectionHeading = (eyebrow, title, action, href) => (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <a className="text-link" href={href}>
          {action}
          <ArrowUpRight size={18} />
        </a>
      )}
    </div>
  );
  function renderHome() {
    return (
      <>
        <section className="hero wrap">
          <div className="hero-content">
            <div className="hero-kicker">
              <span /> REPRESENTANTE OFICIAL HE
            </div>
            <h1>Sua paixão pelo voo merece o equipamento certo.</h1>
            <p>
              Paramotores, peças e acessórios para quem busca confiança,
              qualidade e performance em cada decolagem.
            </p>
            <div className="hero-actions">
              <a className="btn btn-lime" href="#/catalogo">
                Explorar equipamentos <ArrowUpRight size={19} />
              </a>
              <a className="hero-secondary" href="#/marketplace">
                Explorar marketplace <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-bottom">
              <span className="tiny-brand">
                <Wind size={20} />
              </span>
              <span>
                A sua próxima decolagem
                <br />
                <strong>começa com a escolha certa.</strong>
              </span>
            </div>
          </div>
          <div
            className="hero-photo he-hero"
            role="img"
            aria-label="Motor HE MV1 para paramotor"
          >
            <img
              className="he-hero-engine"
              src={heProducts[0].image}
              alt="Motor HE MV1 — fotografia real do produto"
              width="900"
              height="900"
              fetchPriority="high"
            />
            <div className="hero-coordinate">
              <Compass size={18} />
              <span>LINHA HE PARAMOTOR</span>
            </div>
            <div className="hero-photo-caption">
              <span>AZULSKYE · REPRESENTANTE OFICIAL HE</span>
              <strong>HE MV1 · 185 cm³</strong>
            </div>
            <div className="hero-image-count">
              01 <span>/ 01</span>
            </div>
          </div>
        </section>
        <div className="trust-strip wrap">
          <div>
            <ShieldCheck />
            <span>
              <strong>Loja oficial + marketplace</strong>
              <small>Escolha de quem comprar</small>
            </span>
          </div>
          <div>
            <Package />
            <span>
              <strong>Novos e usados</strong>
              <small>Equipamentos para cada etapa</small>
            </span>
          </div>
          <div>
            <UsersRound />
            <span>
              <strong>Uma comunidade que voa</strong>
              <small>Conectando pilotos e vendedores</small>
            </span>
          </div>
          <button onClick={openInstall}>
            <Smartphone />
            <span>
              <strong>AzulSkye no seu celular</strong>
              <small>
                Adicione à tela inicial <ArrowUpRight size={12} />
              </small>
            </span>
          </button>
        </div>
        <section className="marketplace-spotlight wrap" aria-labelledby="marketplace-spotlight-title">
          <div className="marketplace-spotlight-icon"><Store size={30} /></div>
          <div className="marketplace-spotlight-copy">
            <span className="eyebrow">MARKETPLACE AZULSKYE · NOVOS E USADOS</span>
            <h2 id="marketplace-spotlight-title">Compre de outros pilotos. Venda seu equipamento.</h2>
            <p>Além da loja oficial, encontre anúncios da comunidade ou cadastre seus produtos para vender na AzulSkye.</p>
          </div>
          <div className="marketplace-spotlight-actions">
            <a className="btn btn-primary" href="#/marketplace">Ver anúncios <ArrowUpRight size={18} /></a>
            <a className="btn btn-outline" href="#/vender">Quero vender <Plus size={18} /></a>
          </div>
        </section>
        <section className="section wrap">
          {sectionHeading(
            "ESCOLHA SUA PRÓXIMA DECOLAGEM",
            "O que move o seu voo?",
            "Todas as categorias",
            "#/catalogo",
          )}
          <div className="category-grid">
            {categories.map((c, i) => (
              <a
                className={`category-card category-${i}`}
                href={`#/catalogo?categoria=${encodeURIComponent(c.name)}`}
                key={c.name}
              >
                <div>
                  <span className="category-index">0{i + 1}</span>
                  <ArrowUpRight size={19} />
                </div>
                <img
                  src={products.find((p) => p.id === c.id)?.image || `/products/${c.id}.webp`}
                  alt=""
                  loading="lazy"
                />
                <h3>{c.name}</h3>
                <p>{c.caption}</p>
              </a>
            ))}
          </div>
        </section>
        <section className="section wrap featured-section">
          {sectionHeading(
            "REPRESENTANTE OFICIAL HE",
            "A linha HE vem primeiro.",
            "Explorar motores HE",
            "#/catalogo?marca=HE",
          )}
          <div className="product-grid">{featured.filter(p => p.brand === "HE").slice(0,4).map(card)}</div>
        </section>
        <section className="market-banner wrap">
          <div className="market-banner-copy">
            <span className="eyebrow">MARKETPLACE AZULSKYE</span>
            <h2>
              Seu próximo equipamento
              <br />
              pode estar com outro piloto.
            </h2>
            <p>
              Descubra novos e usados de vendedores da comunidade.
              <br />
              Ou dê um novo destino ao que já voou com você.
            </p>
            <div className="button-row">
              <a className="btn btn-primary" href="#/marketplace">
                Explorar marketplace <ArrowUpRight size={18} />
              </a>
              <a className="text-link" href="#/vender">
                Quero vender <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <div className="market-orbit">
            <div className="orbit-ring" />
            <span className="orbit-label top">
              <UsersRound size={18} /> PILOTOS CONECTADOS
            </span>
            <img
              src={"/products/899.webp"}
              alt="Hélice para paramotor"
              loading="lazy"
            />
            <span className="orbit-label bottom">
              <CheckCircle2 size={17} /> NOVAS POSSIBILIDADES
            </span>
          </div>
        </section>
        <section className="section wrap">
          {sectionHeading(
            "DO MOTOR AO ÚLTIMO DETALHE",
            "Cuide de cada parte do voo.",
            "Explorar peças",
            "#/catalogo?categoria=Pe%C3%A7as",
          )}
          <div className="product-grid">{featured.filter(p => p.brand !== "HE").slice(-4).map(card)}</div>
        </section>
        <section
          className="institutional wrap"
          aria-labelledby="institutional-title"
        >
          <div className="institutional-copy">
            <span className="eyebrow">EQUIPADOS PARA IR ALÉM.</span>
            <h2 id="institutional-title">
              Mais do que equipamentos. Paixão pelo voo.
            </h2>
            <p>
              Na AzulSkye, sabemos que cada voo começa muito antes da decolagem.
              Por isso, reunimos paramotores, peças e acessórios para ajudar
              pilotos a encontrar os equipamentos certos para suas necessidades.
              Valorizamos a informação clara, o conhecimento técnico e um
              atendimento próximo de quem compartilha a paixão pelo voo.
            </p>
            <a className="btn btn-outline" href="#/catalogo">
              Conheça os equipamentos <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="institutional-photo">
            <img
              src="/brand/azulskye-voo-charger2.png"
              alt="Pilotos em paramotor com asa Charger 2 laranja e azul"
              loading="lazy"
              width="959"
              height="1640"
            />
          </div>
        </section>
        <section
          className="brand-pillars wrap"
          aria-label="Os pilares da AzulSkye"
        >
          {[
            {
              icon: CircleHelp,
              title: "Conhecimento técnico",
              text: "Informações claras para ajudar você a escolher com mais confiança.",
            },
            {
              icon: Package,
              title: "Equipamentos para seu voo",
              text: "Paramotores, peças e acessórios reunidos em um só lugar.",
            },
            {
              icon: UsersRound,
              title: "Atendimento próximo",
              text: "Uma comunicação objetiva, humana e focada nas necessidades do piloto.",
            },
            {
              icon: Wind,
              title: "Paixão por voar",
              text: "Uma marca construída em torno do universo do paramotor.",
            },
          ].map((p) => (
            <article key={p.title}>
              <p.icon size={26} />
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </section>
        <section className="wrap workshop-home">
          <div>
            <span className="eyebrow">OFICINAS PARCEIRAS</span>
            <h2>Quem cuida do equipamento também faz parte do voo.</h2>
            <p>
              Encontre profissionais e empresas para manutenção de motores,
              velas e outros equipamentos.
            </p>
          </div>
          <div className="button-row">
            <a className="btn btn-primary" href="#/oficinas">
              Explorar oficinas <Wrench size={18} />
            </a>
            <a className="btn btn-outline" href="#/ser-oficina">
              Quero ser parceiro
            </a>
          </div>
        </section>
        <section className="install-banner wrap">
          <div className="install-icon">
            <Smartphone size={31} />
          </div>
          <div>
            <span className="eyebrow">SEMPRE POR PERTO</span>
            <h2>Leve a AzulSkye com você.</h2>
            <p>Acesse a loja e seu painel direto da tela inicial do celular.</p>
          </div>
          <Button variant="outline" onClick={openInstall}>
            Adicionar à tela inicial <Download size={17} />
          </Button>
        </section>
      </>
    );
  }
  function renderCatalog() {
    return (
      <div className="wrap catalog-page">
        <div className="breadcrumb">
          <a href="#/">Início</a>
          <ChevronRight size={13} />
          {page === "/marketplace" ? "Marketplace" : "Loja"}
        </div>
        <div
          className={`catalog-heading ${page === "/marketplace" ? "market-heading" : ""}`}
        >
          <div>
            <span className="eyebrow">
              {page === "/marketplace"
                ? "DE PILOTO PARA PILOTO"
                : "CATÁLOGO AZULSKYE"}
            </span>
            <h1>
              {page === "/marketplace"
                ? "Mais histórias. Novos voos."
                : "Encontre seu próximo voo."}
            </h1>
            <p>
              {page === "/marketplace"
                ? "Negocie equipamentos novos e usados diretamente com o vendedor."
                : "Os equipamentos certos para cada etapa da sua jornada."}
            </p>
          </div>
          {page === "/marketplace" && (
            <a className="btn btn-primary" href="#/vender">
              Venda por aqui <ArrowUpRight size={17} />
            </a>
          )}
        </div>
        <div className="category-tabs">
          {GROUPS.map((c) => (
            <button
              key={c}
              className={activeCategory === c ? "active" : ""}
              onClick={() => {
                setFilters((f) => ({ ...f, category: c }));
                go(
                  page +
                    (activeQuery
                      ? `?q=${encodeURIComponent(activeQuery)}`
                      : ""),
                );
                setVisibleCount(12);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="catalog-tools">
          <span>
            <strong>{filtered.length}</strong>{" "}
            {activeQuery
              ? `resultados para “${activeQuery}”`
              : "produtos encontrados"}
          </span>
          <div>
            <Button
              variant="outline"
              className="filter-toggle"
              onClick={() => setModal({ type: "filters" })}
            >
              <SlidersHorizontal size={16} /> Filtros
            </Button>
            <label className="sort-label">
              <span className="sr-only">Ordenar produtos</span>
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sort: e.target.value }))
                }
              >
                <option value="featured">Relevância</option>
                <option value="price-up">Menor preço</option>
                <option value="price-down">Maior preço</option>
                <option value="name">Nome A–Z</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>
        {page !== "/marketplace" && (
          <p className="merchandising-note">
            <BadgeCheck size={17} /> Representante oficial HE. Os produtos HE
            aparecem primeiro; a ordenação escolhida vale dentro de cada grupo.
          </p>
        )}
        <div className="catalog-layout">
          <aside className="filter-sidebar">{renderFilters()}</aside>
          <div>
            {filtered.length ? (
              <>
                <div className="product-grid catalog-grid">
                  {filtered.slice(0, visibleCount).map(card)}
                </div>
                {visibleCount < filtered.length && (
                  <div className="load-more">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((v) => v + 12)}
                    >
                      Carregar mais produtos <Plus size={17} />
                    </Button>
                    <p>
                      Exibindo {Math.min(visibleCount, filtered.length)} de{" "}
                      {filtered.length}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <Empty
                icon={Search}
                title="Nenhum produto por aqui"
                text="Tente outra busca ou altere os filtros."
              >
                <Button
                  onClick={() => {
                    setFilters({
                      category: "Todos",
                      source: "all",
                      condition: "all",
                      available: false,
                      sort: "featured",
                    });
                    go(page);
                  }}
                >
                  Limpar filtros
                </Button>
              </Empty>
            )}
          </div>
        </div>
      </div>
    );
  }
  function renderFilters() {
    return (
      <div className="filters">
        <h3>
          <SlidersHorizontal size={17} /> Refinar sua busca
        </h3>
        {page !== "/marketplace" && (
          <fieldset>
            <legend>Onde comprar</legend>
            {[
              ["all", "Todas as lojas"],
              ["official", "Loja oficial AzulSkye"],
              ["marketplace", "Marketplace"],
            ].map(([value, label]) => (
              <label className="radio-label" key={value}>
                <input
                  type="radio"
                  name="source"
                  checked={activeFilters.source === value}
                  onChange={() => {
                    setFilters((f) => ({ ...f, source: value }));
                    go(
                      page +
                        (activeQuery
                          ? `?q=${encodeURIComponent(activeQuery)}`
                          : ""),
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset>
          <legend>Estado do equipamento</legend>
          {[
            ["all", "Novos e usados"],
            ["Novo", "Novo"],
            ["Usado", "Usado"],
          ].map(([value, label]) => (
            <label className="radio-label" key={value}>
              <input
                type="radio"
                name="condition"
                checked={filters.condition === value}
                onChange={() => setFilters((f) => ({ ...f, condition: value }))}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Disponibilidade</legend>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={filters.available}
              onChange={(e) =>
                setFilters((f) => ({ ...f, available: e.target.checked }))
              }
            />
            Disponíveis para compra
          </label>
        </fieldset>
        <div className="filter-help">
          <Wind size={25} />
          <h4>Cada detalhe faz diferença.</h4>
          <p>Confira modelo e compatibilidade antes de escolher sua peça.</p>
        </div>
      </div>
    );
  }
  function renderProduct(p) {
    if (!p || (!p.official && p.status !== "approved"))
      return (
        <Empty
          title="Produto não encontrado"
          text="Este anúncio pode estar em análise ou indisponível."
        >
          <a className="btn btn-primary" href="#/catalogo">
            Voltar à loja
          </a>
        </Empty>
      );
    return (
      <div className="wrap product-page">
        <div className="breadcrumb">
          <a href="#/">Início</a>
          <ChevronRight size={13} />
          <a href="#/catalogo">Loja</a>
          <ChevronRight size={13} />
          <span>{groupOf(p)}</span>
        </div>
        <div className="product-detail">
          <div className="product-gallery">
            <div className="detail-photo">
              <img
                src={
                  gallerySelection?.productId === p.id
                    ? gallerySelection.src
                    : p.image
                }
                alt={p.name}
              />
              <span className="condition">{p.condition}</span>
              <button
                className="favorite"
                aria-label="Favoritar produto"
                onClick={() => toggleFavorite(p.id)}
              >
                <Heart
                  fill={data.favorites.includes(p.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            {p.gallery?.length > 1 && (
              <div
                className="gallery-thumbnails"
                aria-label="Galeria do produto"
              >
                {p.gallery.map((src, i) => (
                  <button
                    key={src}
                    aria-label={`Ver foto ${i + 1} de ${p.name}`}
                    aria-pressed={
                      (gallerySelection?.productId === p.id
                        ? gallerySelection.src
                        : p.image) === src
                    }
                    onClick={() =>
                      setGallerySelection({ productId: p.id, src })
                    }
                  >
                    <img src={src} alt={`Foto ${i + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="detail-info">
            <div className="detail-badges">
              <Tag>
                {p.official ? (
                  <>
                    <BadgeCheck size={13} />{" "}
                    {p.brand === "HE" ? "HE · LOJA OFICIAL" : "LOJA OFICIAL"}
                  </>
                ) : (
                  <>
                    <Store size={13} /> MARKETPLACE
                  </>
                )}
              </Tag>
              <span>{p.sku || `REF. ${p.id}`}</span>
            </div>
            <h1>{p.name}</h1>
            <p className="sold-by">
              Vendido por <strong>{p.seller}</strong>
              {p.official && <BadgeCheck size={16} />}
            </p>
            <div className="detail-price">{money(p.price)}</div>
            <p className="stock">
              <span className={`status-dot ${!p.stock ? "gray" : ""}`} />
              {p.stock
                ? p.availability === "order"
                  ? "Sob encomenda · confirme o prazo com a AzulSkye"
                  : "Disponível no catálogo"
                : "Produto indisponível"}
            </p>
            {!p.official || p.price==null ? <Inquiry partner={p.official?null:{id:p.sellerId,phone:p.phone}} product={p} user={user} refresh={store.refresh}/> : <Button
              className="full"
              disabled={!p.stock || p.price == null}
              onClick={() => addCart(p)}
            >
              <ShoppingBag size={19} />
              {p.price == null
                ? "Preço sob consulta"
                : p.stock
                  ? "Adicionar à sacola"
                  : "Indisponível"}
            </Button>}
            <Button
              variant="outline"
              className="full"
              onClick={() => toggleFavorite(p.id)}
            >
              <Heart size={17} />
              {data.favorites.includes(p.id)
                ? "Remover dos favoritos"
                : "Salvar nos favoritos"}
            </Button>
            <div className="detail-shipping">
              <Truck size={22} />
              <div>
                <strong>Entrega organizada por quem vende</strong>
                <p>{p.official?store.catalog?.settings.pickup:"Combine pagamento e entrega diretamente com quem anunciou."}</p>
              </div>
            </div>
            <div className="detail-features">
              <span>
                <ShieldCheck size={16} /> Vendedor identificado
              </span>
              <span>
                <Package size={16} /> Estado: {p.condition}
              </span>
            </div>
          </div>
        </div>
        <div className="detail-bottom">
          <section>
            <span className="eyebrow">CONHEÇA O EQUIPAMENTO</span>
            <h2>Sobre este produto</h2>
            <p>
              {p.description ||
                "Detalhes do produto serão adicionados em breve."}
            </p>
            <p className="muted">
              Descrição do catálogo de origem. Confirme as especificações
              técnicas e a compatibilidade antes de comprar.
            </p>
          </section>
          <section>
            <h3>Informações do cadastro</h3>
            <dl className="specs">
              {[
                ...(p.brand ? [["Marca", p.brand]] : []),
                ...Object.entries(p.specifications || {}),
                ["Estado", p.condition],
                ["Categoria", groupOf(p)],
                ["SKU", p.sku || "Não informado"],
                ["Peso", p.weight ? `${p.weight} kg` : "Não informado"],
                [
                  "Dimensões (C × L × A)",
                  p.length && p.width && p.height
                    ? `${p.length} × ${p.width} × ${p.height} cm`
                    : "Não informadas",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <section className="section">
          {sectionHeading(
            "CONTINUE EXPLORANDO",
            "Outras possibilidades para voar.",
          )}
          <div className="product-grid">
            {products
              .filter(
                (q) =>
                  !["hidden", "rejected"].includes(q.status) &&
                  q.id !== p.id &&
                  groupOf(q) === groupOf(p) &&
                  (q.official || q.status === "approved"),
              )
              .slice(0, 4)
              .map(card)}
          </div>
        </section>
      </div>
    );
  }
  function renderCart() {
    const groups = orderGroups(data.cart, products);
    const total = groups.reduce((s, g) => s + g.total, 0);
    return (
      <div className="wrap cart-page">
        <div className="breadcrumb">
          <a href="#/">Início</a>
          <ChevronRight size={13} />
          Sacola
        </div>
        <span className="eyebrow">SEU PRÓXIMO VOO</span>
        <h1>
          Na sua sacola<span className="count-inline">{cartCount}</span>
        </h1>
        {!groups.length ? (
          <Empty
            icon={ShoppingBag}
            title="Uma sacola cheia de possibilidades"
            text="Explore os equipamentos e escolha o que vai acompanhar seu próximo voo."
          >
            <a className="btn btn-primary" href="#/catalogo">
              Explorar a loja <ArrowRight size={16} />
            </a>
          </Empty>
        ) : (
          <div className="cart-layout">
            <div>
              {groups.map((g) => (
                <section className="cart-group" key={g.sellerId}>
                  <h3>
                    <Store size={17} />
                    {g.seller}
                    {g.sellerId === "official" && <BadgeCheck size={16} />}
                  </h3>
                  {g.items.map((p) => (
                    <div className="cart-line" key={p.id}>
                      <img src={p.image} alt={p.name} />
                      <div>
                        <a href={`#/produto/${p.id}`}>{p.name}</a>
                        <small>{p.condition}</small>
                        <div className="quantity">
                          <button
                            aria-label={`Diminuir quantidade de ${p.name}`}
                            onClick={() =>
                              update((d) => ({
                                ...d,
                                cart: d.cart
                                  .map((l) =>
                                    l.id === p.id
                                      ? { ...l, quantity: l.quantity - 1 }
                                      : l,
                                  )
                                  .filter((l) => l.quantity > 0),
                              }))
                            }
                          >
                            <Minus size={13} />
                          </button>
                          <span>{p.quantity}</span>
                          <button
                            aria-label={`Aumentar quantidade de ${p.name}`}
                            onClick={() => addCart(p)}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="cart-line-end">
                        <strong>{money(p.price * p.quantity)}</strong>
                        <button
                          className="icon-btn"
                          aria-label={`Remover ${p.name}`}
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              cart: d.cart.filter((l) => l.id !== p.id),
                            }))
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="cart-group-footer">
                    <Truck size={15} /> Entrega separada por vendedor{" "}
                    <strong>{money(g.total)}</strong>
                  </p>
                </section>
              ))}
            </div>
            <aside className="order-summary">
              <h2>Resumo da sacola</h2>
              <div>
                <span>Produtos ({cartCount})</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Entrega</span>
                <span>Conferir abaixo</span>
              </div>
              <div className="summary-total">
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
              <p>
                O pagamento online atende somente à loja oficial. Confira a forma de entrega antes de pagar. No marketplace, combine diretamente com o vendedor.
              </p>
              <InfinitePayCheckout cart={data.cart} products={products} user={user} pickup={store.catalog?.settings.pickup}/>
              <a className="text-link" href="#/catalogo">
                <ArrowLeft size={15} /> Continuar explorando
              </a>
            </aside>
          </div>
        )}
      </div>
    );
  }
  function renderModal() {
    if (!modal) return null;
    const close = () => setModal(null);
    return (
      <Dialog
        title={
          {
            install: "AzulSkye na tela inicial",
            filters: "Filtrar produtos",
          }[modal.type]
        }
        close={close}
        wide={modal.type === "productForm"}
      >
        {modal.type === "install" && (
          <div className="install-instructions">
            <img
              src="/brand/azulskye-simbolo-v3-192.png"
              alt="Ícone AzulSkye"
              width="76"
              height="76"
            />
            <h3>Seu próximo voo, a um toque.</h3>
            <p>Acesse este site pelo navegador do celular para instalar.</p>
            <ol>
              <li>
                <strong>iPhone / iPad</strong>
                <span>
                  No Safari, toque em Compartilhar e depois em “Adicionar à Tela
                  de Início”.
                </span>
              </li>
              <li>
                <strong>Android</strong>
                <span>
                  No Chrome, abra o menu ⋮ e escolha “Instalar aplicativo” ou
                  “Adicionar à tela inicial”.
                </span>
              </li>
              <li>
                <strong>Computador</strong>
                <span>
                  Em navegadores compatíveis, procure o ícone de instalação na
                  barra de endereços.
                </span>
              </li>
            </ol>
          </div>
        )}
        {modal.type === "filters" && (
          <>
            {renderFilters()}
            <Button className="full" onClick={close}>
              Ver resultados <ArrowRight size={16} />
            </Button>
          </>
        )}
      </Dialog>
    );
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <div className="announcement">
        <span>UM NOVO HORIZONTE PARA QUEM VOA.</span>
        <span className="announcement-right">
          Loja oficial & marketplace <span>↗</span>
        </span>
      </div>
      <header className={`site-header ${dashboard ? "compact-header" : ""}`}>
        <div className="header-main wrap">
          <button
            className="icon-btn mobile-menu-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={23} />
          </button>
          <Brand />
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={19} />
            <input
              aria-label="Buscar equipamentos"
              placeholder="O que vai no seu próximo voo?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-actions">
            <a className="sell-link" href="#/vender">
              Venda na AzulSkye <ArrowUpRight size={15} />
            </a>
            <a
              className="header-account"
              href={
                user
                  ? user.role === "client"
                    ? "#/conta"
                    : user.role === "workshop"
                      ? "#/oficina"
                      : "#/painel"
                  : "#/entrar"
              }
              aria-label={user ? "Acessar minha conta" : "Entrar"}
            >
              <UserRound size={21} />
              <span>
                <small>
                  {user
                    ? `Olá, ${user.name.split(" ")[0]}`
                    : "Bem-vindo a bordo"}
                </small>
                <strong>
                  {user ? ROLE_NAMES[user.role] : "Entre ou cadastre-se"}
                </strong>
              </span>
            </a>
            <a
              href="#/favoritos"
              className="icon-btn favorites-header"
              aria-label="Favoritos"
            >
              <Heart size={21} />
            </a>
            <a
              href="#/sacola"
              className="icon-btn bag-button"
              aria-label={`Sacola com ${cartCount} produtos`}
            >
              <ShoppingBag size={21} />
              {cartCount > 0 && <b>{cartCount}</b>}
            </a>
          </div>
        </div>
        {!dashboard && (
          <nav className="desktop-nav wrap">
            <a href="#/catalogo" className="all-categories">
              <Menu size={17} /> Todas as categorias <ChevronDown size={13} />
            </a>
            {["Paramotores", "Peças", "Asas", "Hélices", "Estruturas"].map(
              (c) => (
                <a
                  key={c}
                  href={`#/catalogo?categoria=${encodeURIComponent(c)}`}
                >
                  {c}
                </a>
              ),
            )}
            <a
              className={
                page === "/marketplace" ? "nav-market active" : "nav-market"
              }
              href="#/marketplace"
            >
              <span /> Marketplace <ArrowUpRight size={14} />
            </a>
          </nav>
        )}
      </header>
      {mobileMenu && (
        <div className="mobile-menu">
          <div>
            <Brand />
            <button
              className="icon-btn"
              aria-label="Fechar menu"
              onClick={() => setMobileMenu(false)}
            >
              <X />
            </button>
          </div>
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              placeholder="Buscar equipamentos"
              aria-label="Buscar no menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="icon-btn" aria-label="Buscar">
              <ArrowRight size={18} />
            </button>
          </form>
          <a href="#/catalogo">
            Loja oficial <ArrowUpRight size={18} />
          </a>
          <a href="#/marketplace">
            Marketplace <ArrowUpRight size={18} />
          </a>
          <a href="#/vender">
            Quero vender <ArrowUpRight size={18} />
          </a>
          <a href="#/oficinas">
            Oficinas parceiras <Wrench size={18} />
          </a>
          <a href="#/entrar">
            Entrar na AzulSkye <UserRound size={18} />
          </a>
          <button
            onClick={() => {
              setMobileMenu(false);
              openInstall();
            }}
          >
            Instalar aplicativo <Download size={18} />
          </button>
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        {store.error ? <Empty title="Não foi possível atualizar a loja" text={store.error}><Button onClick={()=>store.refresh().catch(()=>{})}>Tentar novamente</Button></Empty> : !store.catalog ? <section className="wrap section" role="status">Carregando a loja…</section> : page === "/" ? (
          renderHome()
        ) : page === "/telas" ? (
          <ScreenDirectory />
        ) : page === "/oficinas" ? (
          <Workshops shops={store.catalog?.workshops||[]} user={user} refresh={store.refresh}/>
        ) : ["/catalogo", "/marketplace"].includes(page) ? (
          renderCatalog()
        ) : page.startsWith("/produto/") ? (
          renderProduct(selected)
        ) : page === "/sacola" ? (
          renderCart()
        ) : page === "/pagamento" ? (
          <InfinitePayReturn onPaid={(items) => update((d) => ({ ...d, cart: d.cart.flatMap((line) => {
            const paid = items.find((item) => item.id === line.id)?.quantity || 0;
            return line.quantity > paid ? [{ ...line, quantity: line.quantity - paid }] : [];
          }) }))} />
        ) : ["/entrar","/vender","/conta","/ser-oficina"].includes(page) || dashboard ? (
          <Portal key={page+String(requestedRole)} page={page} role={requestedRole} route={route} store={store} openInstall={openInstall}/>
        ) : page === "/favoritos" ? (
          <section className="wrap section favorites-page">
            {sectionHeading("SUAS ESCOLHAS", "Favoritos para o próximo voo.")}
            <div className="product-grid">
              {products
                .filter(
                  (p) =>
                    !["hidden", "rejected"].includes(p.status) &&
                    data.favorites.includes(p.id) &&
                    (p.official || p.status === "approved"),
                )
                .map(card)}
            </div>
            {!data.favorites.length && (
              <Empty
                icon={Heart}
                title="Guarde o que faz seus olhos brilharem"
                text="Toque no coração de um produto para encontrá-lo aqui."
              >
                <a className="btn btn-primary" href="#/catalogo">
                  Explorar produtos
                </a>
              </Empty>
            )}
          </section>
        ) : (
          <Empty
            title="Esse horizonte ainda não existe"
            text="Volte à loja para continuar explorando."
          >
            <a className="btn btn-primary" href="#/">
              Ir para o início
            </a>
          </Empty>
        )}
      </main>
      {!dashboard && (
        <footer className="site-footer">
          <div className="wrap footer-main">
            <div className="footer-brand">
              <Brand light />
              <p>
                Paramotores, peças e acessórios.
                <br />
                Para quem vive a liberdade de voar.
              </p>
              <span>Equipados para ir além.</span>
              <div className="he-official-footer">
                <BadgeCheck size={18} /> Representante oficial HE
              </div>
            </div>
            <div>
              <h3>Explore a AzulSkye</h3>
              <a href="#/catalogo?origem=official">Loja oficial</a>
              <a href="#/marketplace">Marketplace</a>
              <a href="#/catalogo">Todas as categorias</a>
            </div>
            <div>
              <h3>Seu espaço</h3>
              <a href="#/conta">Minha conta</a>
              <a href="#/favoritos">Favoritos</a>
              <a href="#/vender">Seja um vendedor</a>
              <a href="#/oficinas">Oficinas parceiras</a>
              <a href="#/ser-oficina">Cadastrar oficina / profissional</a>
              <a href="#/entrar">Entrar na AzulSkye</a>
              <a href="#/telas">Central de todas as telas</a>
            </div>
            <div className="footer-app">
              <h3>Nos vemos no próximo voo.</h3>
              <p>Leve a AzulSkye para a tela inicial.</p>
              <button onClick={openInstall}>
                <Smartphone size={19} /> Adicionar aplicativo{" "}
                <ArrowUpRight size={17} />
              </button>
            </div>
          </div>
          <div className="wrap footer-bottom">
            <span>
              © {new Date().getFullYear()} AzulSkye. Todos os direitos
              reservados.
            </span>

            <a href="https://azulsky.com/" target="_blank" rel="noreferrer">
              azulsky.com <ArrowUpRight size={12} />
            </a>
          </div>
        </footer>
      )}
      <nav
        className="mobile-bottom"
        aria-label="Navegação principal no celular"
      >
        <a href="#/" className={page === "/" ? "active" : ""}>
          <Compass size={21} />
          <span>Início</span>
        </a>
        <a href="#/catalogo" className={page === "/catalogo" ? "active" : ""}>
          <Search size={21} />
          <span>Explorar</span>
        </a>
        <a
          href="#/marketplace"
          className={page === "/marketplace" ? "active" : ""}
        >
          <Store size={21} />
          <span>Marketplace</span>
        </a>
        <a href="#/sacola" className={page === "/sacola" ? "active" : ""}>
          <span className="mobile-bag">
            <ShoppingBag size={21} />
            {cartCount > 0 && <i>{cartCount}</i>}
          </span>
          <span>Sacola</span>
        </a>
        <a
          href={
            user
              ? user.role === "client"
                ? "#/conta"
                : user.role === "workshop"
                  ? "#/oficina"
                  : "#/painel"
              : "#/entrar"
          }
          className={
            dashboard || page === "/conta" || page === "/entrar" ? "active" : ""
          }
        >
          <UserRound size={21} />
          <span>
            {user?.role === "admin"
              ? "Gestão"
              : user?.role === "seller"
                ? "Painel"
                : user?.role === "workshop"
                  ? "Oficina"
                  : "Conta"}
          </span>
        </a>
      </nav>
      {renderModal()}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}

    </>
  );
}
