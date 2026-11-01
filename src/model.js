export const DEMO_PASSWORD = "AzulDemo123!";
export const DEMO_ACCOUNTS = [
  {
    role: "client",
    label: "Cliente",
    email: "cliente@azulskye.demo",
    name: "Marina Costa",
  },
  {
    role: "seller",
    label: "Vendedor",
    email: "vendedor@azulskye.demo",
    name: "Rafael Oliveira",
    store: "Altitude Equipamentos",
    sellerId: "altitude",
  },
  {
    role: "admin",
    label: "Administrador",
    email: "admin@azulskye.demo",
    name: "Equipe AzulSkye",
  },
];
export const money = (value) =>
  value == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
export const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const GROUPS = [
  "Todos",
  "Paramotores",
  "Motores",
  "Peças",
  "Asas",
  "Hélices",
  "Estruturas",
  "Segurança",
  "Acessórios",
];
export function groupOf(p) {
  const text = normalize(p.categories.join(" "));
  if (/pecas|grupo|bloco/.test(text)) return "Peças";
  if (/paramotor/.test(text)) return "Paramotores";
  if (/motores/.test(text)) return "Motores";
  if (/asas/.test(text)) return "Asas";
  if (/helices/.test(text)) return "Hélices";
  if (/estruturas/.test(text)) return "Estruturas";
  if (/seguranca|paraquedas/.test(text)) return "Segurança";
  return "Acessórios";
}
export function filterProducts(
  products,
  {
    query = "",
    category = "Todos",
    source = "all",
    condition = "all",
    available = false,
    sort = "featured",
    brand = "all",
  } = {},
) {
  const list = products.filter(
    (p) =>
      (p.official || p.status === "approved") &&
      normalize(
        `${p.name} ${p.sku} ${p.brand || ""} ${p.categories.join(" ")} ${p.seller}`,
      ).includes(normalize(query)) &&
      (category === "Todos" || groupOf(p) === category) &&
      (source === "all" ||
        (source === "official" ? p.official : !p.official)) &&
      (brand === "all" || normalize(p.brand || "") === normalize(brand)) &&
      (condition === "all" || p.condition === condition) &&
      (!available || p.stock),
  );
  if (sort === "price-up")
    list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (sort === "price-down")
    list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  if (sort === "name")
    list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  // HE is the merchandising priority; explicit sorting is retained within each brand group.
  list.sort((a, b) => Number(b.brand === "HE") - Number(a.brand === "HE"));
  return list;
}
export function orderGroups(cart, products) {
  const groups = {};
  for (const line of cart) {
    const p = products.find((p) => p.id === line.id);
    if (
      !p ||
      !p.stock ||
      p.price == null ||
      (!p.official && p.status !== "approved")
    )
      continue;
    (groups[p.sellerId] ??= {
      seller: p.seller,
      sellerId: p.sellerId,
      items: [],
      total: 0,
    }).items.push({ ...p, quantity: line.quantity });
    groups[p.sellerId].total += p.price * line.quantity;
  }
  return Object.values(groups);
}
export function validateProduct(data) {
  if (!data.name?.trim() || !data.description?.trim())
    return "Preencha nome e descrição.";
  if (!(Number(data.price) > 0)) return "Informe um preço maior que zero.";
  if (!["Novo", "Usado"].includes(data.condition))
    return "Selecione o estado do produto.";
  if (!data.image) return "Adicione uma foto do produto.";
  if (
    ["weight", "length", "width", "height"].some(
      (key) => !(Number(data[key]) > 0),
    )
  )
    return "Informe peso e todas as dimensões maiores que zero.";
  return "";
}
export function demoSeed(products) {
  const byId = (id) => products.find((p) => p.id === id) ?? products[0];
  return {
    cart: [],
    favorites: [],
    commission: 0,
    sellers: [
      {
        id: "altitude",
        name: "Rafael Oliveira",
        store: "Altitude Equipamentos",
        documentType: "CNPJ",
        email: "vendedor@azulskye.demo",
        city: "Belo Horizonte, MG",
        status: "approved",
        initials: "AE",
        bio: "Equipamentos novos e usados para sua próxima decolagem.",
      },
      {
        id: "s-demo-1",
        name: "Bruno Martins",
        store: "Horizonte Voo Livre",
        documentType: "CNPJ",
        email: "horizonte@example.com",
        city: "Curitiba, PR",
        status: "pending",
        initials: "HV",
        bio: "Loja demonstrativa de equipamentos de voo.",
      },
      {
        id: "s-demo-2",
        name: "Camila Alves",
        store: "Camila Equipamentos",
        documentType: "CPF",
        email: "camila@example.com",
        city: "São Paulo, SP",
        status: "pending",
        initials: "CE",
        bio: "Cadastro demonstrativo de pessoa física.",
      },
    ],
    listings: [
      {
        ...byId("899"),
        id: "demo-1",
        categories: ["Hélices"],
        name: "Hélice E-props · seminova",
        price: 1890,
        condition: "Usado",
        seller: "Altitude Equipamentos",
        sellerId: "altitude",
        official: false,
        status: "approved",
        stock: true,
        city: "Belo Horizonte, MG",
        weight: "1.2",
        length: "130",
        width: "20",
        height: "15",
        description:
          "Anúncio de demonstração. Equipamento usado, com marcas de uso. Fotografias ilustrativas do catálogo.",
      },
      {
        ...(products.find((p) => /capacete/i.test(p.name)) ?? byId("89")),
        id: "demo-2",
        categories: ["Segurança"],
        name: "Capacete para voo · novo",
        price: 780,
        condition: "Novo",
        seller: "Altitude Equipamentos",
        sellerId: "altitude",
        official: false,
        status: "approved",
        stock: true,
        city: "Belo Horizonte, MG",
        weight: "1",
        length: "35",
        width: "30",
        height: "30",
        description: "Anúncio demonstrativo, sem oferta comercial real.",
      },
      {
        ...byId("1764"),
        id: "demo-3",
        categories: ["Estruturas"],
        name: "Estrutura de paramotor · usada",
        price: 4200,
        condition: "Usado",
        seller: "Altitude Equipamentos",
        sellerId: "altitude",
        official: false,
        status: "pending",
        stock: true,
        weight: "8",
        length: "80",
        width: "80",
        height: "40",
        description: "Anúncio demonstrativo aguardando aprovação.",
      },
    ],
    orders: [
      {
        id: "AZ-DEMO-1042",
        date: "2026-11-01T12:10:00-03:00",
        customer: "Cliente demonstrativo",
        seller: "AzulSkye",
        sellerId: "official",
        total: byId("89").price,
        status: "Pago",
        items: [{ ...byId("89"), quantity: 1 }],
        demo: true,
      },
      {
        id: "AZ-DEMO-1041",
        date: "2026-10-31T10:00:00-03:00",
        customer: "Cliente demonstrativo",
        seller: "Altitude Equipamentos",
        sellerId: "altitude",
        total: 1890,
        status: "Em preparação",
        items: [
          {
            ...byId("899"),
            name: "Hélice E-props · seminova",
            price: 1890,
            quantity: 1,
          },
        ],
        demo: true,
      },
      {
        id: "AZ-DEMO-1040",
        date: "2026-10-30T14:00:00-03:00",
        customer: "Marina Costa",
        customerId: "cliente@azulskye.demo",
        seller: "AzulSkye",
        sellerId: "official",
        total: 695.88,
        status: "Enviado",
        tracking: "RA123456789BR (exemplo)",
        items: [{ ...byId("728"), quantity: 1 }],
        demo: true,
      },
    ],
    notifications: [
      {
        id: "welcome",
        title: "Sua central de voo está pronta",
        text: "Explore a demonstração. Pedidos e vendedores de exemplo não representam operações reais.",
        read: false,
      },
    ],
  };
}
