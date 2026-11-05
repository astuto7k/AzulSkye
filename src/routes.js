export function resolveRoute(route) {
  const path = route.split("?")[0];
  const match = path.match(/^\/(admin|vendedor|oficina)(?:\/(.*))?$/);
  return match
    ? {
        page: `/painel/${match[2] || "visao-geral"}`,
        role:
          match[1] === "admin"
            ? "admin"
            : match[1] === "oficina"
              ? "workshop"
              : "seller",
      }
    : { page: path, role: null };
}
export const SCREEN_GROUPS = [
  {
    title: "Oficina parceira",
    description:
      "Perfil demonstrativo para empresas e profissionais de manutenção.",
    screens: [
      ["Visão geral", "/oficina"],
      ["Meu perfil e serviços", "/oficina/perfil"],
      ["Solicitações de manutenção", "/oficina/solicitacoes"],
    ],
  },
  {
    title: "Loja e cliente",
    description:
      "Explore a loja oficial, o marketplace e a experiência de compra.",
    screens: [
      ["Início", "/"],
      ["Catálogo completo", "/catalogo"],
      ["Linha HE", "/catalogo?marca=HE"],
      ["Marketplace", "/marketplace"],
      ["Produto HE MV1", "/produto/he-paramotor-mv1"],
      ["Produto HE MV2", "/produto/he-paramotor-mv2"],
      ["Produto HE RS206", "/produto/he-paramotor-rs206-performance"],
      ["Produto HE RS185", "/produto/he-paramotor-rs185-performance"],
      ["Sacola e checkout de teste", "/sacola"],
      ["Favoritos", "/favoritos"],
      ["Acessos de demonstração", "/entrar"],
      ["Conta e pedidos do cliente", "/conta"],
      ["Cadastro de vendedor", "/vender"],
      ["Oficinas parceiras", "/oficinas"],
      ["Cadastro de oficina / profissional", "/ser-oficina"],
    ],
  },
  {
    title: "Administrador",
    description:
      "Entre com o perfil de administrador para supervisionar a operação demonstrativa.",
    screens: [
      ["Visão geral", "/admin"],
      ["Pedidos e detalhes", "/admin/pedidos"],
      ["Produtos e aprovação de anúncios", "/admin/produtos"],
      ["Aprovação de vendedores", "/admin/vendedores"],
      ["Aprovação de oficinas e serviços", "/admin/oficinas"],
      ["Financeiro", "/admin/financeiro"],
      ["Configurações e comissão", "/admin/configuracoes"],
    ],
  },
  {
    title: "Vendedor",
    description:
      "Entre com o perfil de vendedor para acompanhar sua loja de exemplo.",
    screens: [
      ["Visão geral", "/vendedor"],
      ["Pedidos e detalhes", "/vendedor/pedidos"],
      ["Produtos e cadastro de anúncio", "/vendedor/produtos"],
      ["Financeiro", "/vendedor/financeiro"],
      ["Configurações e instalação", "/vendedor/configuracoes"],
    ],
  },
];
