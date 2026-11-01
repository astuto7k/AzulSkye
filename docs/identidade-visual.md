# Identidade visual oficial — AzulSkye

## Escopo e preservação

Identidade implementada na branch `codex/identidade-oficial`. A etapa seguinte de linha HE e publicação foi explicitamente autorizada pelo proprietário; ver `linha-he.md`. React + Vite e os fluxos existentes foram preservados. Os 160 produtos, preços, estoque e dados de demonstração existentes não foram alterados.

## Arte oficial

O arquivo enviado foi copiado integralmente para `public/brand/azulskye-logo-oficial.png`. SHA-256 da origem e da cópia: `99e0ddbce65ee9dde36eb4319bf1424e0aed73f1f19f3bea5902a8aea39e1b42`. Resolução 2172 × 724, proporção 3:1. Nenhum recorte, remoção de fundo, filtro, recoloração ou redesenho.

`src/components/Brand.jsx` reutiliza a imagem no header, menu mobile, footer e assinatura do painel. Footer navy recebe a arte sobre sua própria superfície branca. Favicon aponta para a imagem original.

Os ícones quadrados de instalação 192/512 são uma proposta separada: logo completa, proporcionalmente reduzida e centralizada sobre margem branca. Não foi criado símbolo isolado. Uma versão específica do símbolo para tamanhos pequenos ainda depende de um arquivo aprovado do proprietário. A logo oficial permanece intacta.

## Design system

- `src/tokens.css`: paleta exata fornecida, estados semânticos e famílias tipográficas.
- `src/styles.css`: layouts e comportamento responsivo existentes; cores antigas convertidas a tokens e tamanhos minúsculos removidos.
- `src/identity.css`: hierarquia legível e aplicação da identidade aos componentes e breakpoints.
- Exo 2: títulos, números e informações destacadas. Manrope: corpo, menus, formulários e botões; carregamento com display=swap e preconnect.
- Ações primárias azuis, secundárias com borda azul, seções institucionais/navy e superfícies branco/gelo.
- Verde somente para confirmações e disponibilidade; identificação de loja oficial e marca em azul.

## Homepage e demais interfaces

Hero com título, subtítulo e CTAs aprovados. Fotografia real existente preservada. Inclusão do texto institucional e dos quatro pilares exatamente conforme o briefing. Categoria Peças usa imagem de peça efetivamente presente no catálogo.

Header com arte oficial e busca existente; footer navy sem criar contatos, políticas vazias ou credenciais empresariais. Catálogo, produto, sacola, checkout demonstrativo, acessos, painéis e diálogos receberam a mesma hierarquia e paleta.

Não foram inventados descontos, avaliações, serviços, certificações, potência ou compatibilidade. Não houve mudanças em regras de negócio nem adição de novos exemplos comerciais.

Manifesto PWA, cor de interface, fallback offline e ícones atualizados. Metadados description, Open Graph e Twitter incluídos. A prévia permanece demonstrativa, com os mesmos acessos e armazenamento local.

## Verificações

- `npm run lint`: ESLint para JS/JSX, sintaxe e erros básicos; sem regra de unused-vars por haver componentes JSX e imports legados. O projeto é JavaScript, não TypeScript. `npm run check` combina lint e build como checagem da etapa.
- `npm run build`: build de produção Vite com compilação JSX e CSS.
- `npm test`: cinco testes funcionais existentes e um teste de contraste dos pares de cores do design system (mínimo 4,5:1). Isso não equivale a uma auditoria completa de acessibilidade.
- Logo original e cópia conferidas por SHA-256.
- Navegador: home, catálogo, marketplace, produto, sacola, acessos e painéis revisados em larguras 390, 768 e 1440. Nenhuma rolagem horizontal indevida nos cenários medidos. Busca por hélice retornou resultados; inclusão e remoção da sacola confirmadas; formulário técnico de produto, checkout demonstrativo (sem submissão), abertura/fechamento do menu mobile e acessos de cliente/administrador/vendedor conferidos. Console da aba de verificação sem erros ou warnings capturados.
- Sem notificações, cobrança ou operações externas reais.

## Pendências de operação

As integrações já pendentes continuam pendentes: autenticação real, banco, Woovi, frete e push. Dados técnicos ausentes, descrição truncada e ausência de galeria no catálogo original da prévia não foram inventados. A publicação foi autorizada na etapa da linha HE.

## Resultado final

`npm run check` (lint + compilação JS/JSX/CSS e build) passou; `npm test`: 6/6 aprovados. A revisão de contraste cobre os pares de cores utilizados pelo sistema, não constitui certificação WCAG de toda a aplicação. Instalação em dispositivo físico e crawlers sociais não foram testados. Não há código TypeScript neste projeto.
