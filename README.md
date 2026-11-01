# AzulSkye

Prévia visual mobile first de loja própria + marketplace de paramotores e peças. React + Vite, pronta para hospedagem estática na Vercel.

## Rodar

Requer Node.js 22.12+ (ou versão LTS mais recente compatível).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Acessos de demonstração

Abra `/#/entrar`. Também é possível entrar diretamente nos botões de perfil.

| Perfil | Email | Senha de teste |
| --- | --- | --- |
| Cliente | cliente@azulskye.demo | AzulDemo123! |
| Vendedor | vendedor@azulskye.demo | AzulDemo123! |
| Administrador | admin@azulskye.demo | AzulDemo123! |

Essas credenciais são públicas e fictícias. Não há autenticação real. Nunca utilizar esta implementação como controle de acesso a dados reais.

## O que está incluído

- Loja oficial com os 160 produtos extraídos do backup autorizado, preços, SKUs, categorias e imagens locais otimizadas.
- Marketplace separado, com exemplos de anúncios identificados como demonstrativos.
- Busca sem distinção de acentos, filtros, ordenação, paginação incremental e favoritos.
- Página de produto, sacola com quantidades e separação por vendedor, checkout de teste sem cobrança.
- Conta do cliente e acompanhamento de pedidos demonstrativos.
- Cadastro de vendedor CPF/CNPJ sujeito à aprovação local; formulário solicita somente tipo de cadastro, sem documentos reais.
- Painel do vendedor com seus anúncios e pedidos; produto novo/usado, foto, descrição, preço, quantidade, SKU, peso e dimensões.
- Painel administrativo com aprovação/recusa de vendedores e anúncios, gestão de pedidos de teste, comissão configurável e central visual de notificações.
- Alterações de anúncios de terceiros retornam à análise. Vendedor suspenso não tem anúncios exibidos no catálogo público.
- Manifesto PWA, ícones 192/512, modo standalone, service worker com página offline e instruções de instalação.

## Publicar pela Vercel

1. Importe o repositório `astuto7k/AzulSkye` em **Add New → Project**.
2. Use a raiz do repositório como Root Directory e o preset **Vite**.
3. Build: `npm run build`. Output Directory: `dist`. Install: `npm ci`.
4. Esta versão visual não precisa de variáveis de ambiente.
5. Faça o deploy e abra a URL HTTPS fornecida pela Vercel.
6. Em Settings → Domains adicione `azulsky.com` e, se desejado, `www.azulsky.com`. Aplique no provedor DNS somente os registros indicados pela Vercel para esse projeto, preservando registros de email existentes.

`vercel.json` contém a configuração de build, fallback e cabeçalhos. O domínio não foi alterado por este projeto. Login e links internos usam rotas hash, funcionando em hospedagem estática e na PWA.

## Instalar no celular

Acesse a URL publicada em HTTPS. iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Android: Chrome → menu → Instalar aplicativo/Adicionar à tela inicial. O botão do site abre o prompt quando disponível ou apresenta instruções. No desktop, navegadores compatíveis oferecem instalação pela barra de endereços.

A instalação e o fallback offline devem ser testados na URL HTTPS final em dispositivos físicos. O service worker só é registrado no build de produção. O cache guarda somente a página offline e o ícone; não guarda pedidos, perfis ou páginas como dados de servidor.

## Dados e limites desta etapa

- Carrinho, favoritos, exemplos, cadastros, anúncios e comissão ficam no localStorage deste navegador (`azulskye-visual-v1`). A sessão demonstrativa fica no sessionStorage. Não há sincronização entre dispositivos ou usuários.
- Imagens enviadas no formulário são reduzidas e guardadas somente no navegador. O limite de armazenamento local continua aplicável.
- Os pedidos e indicadores iniciais são fictícios, não os pedidos do banco original.
- Não foram importados usuários, clientes, assinantes, credenciais, contatos de pagamento, logs, banco SQL ou arquivos PHP.
- Somente catálogo comercial autorizado e imagens fazem parte deste repositório público.
- Os produtos mantêm textos do catálogo original em formato de texto, sem HTML executável; a descrição exibida é um trecho de até 500 caracteres. Condição inicial dos itens oficiais é “Novo” e precisa ser confirmada antes da operação real. Campo ausente de preço permanece “Sob consulta”; imagem ausente usa placeholder.
- Google, email, Woovi, cálculo de frete, envio de mensagens e notificações push **não estão conectados**. O painel identifica esses estados. Pedidos de teste não geram cobrança ou frete.
- Comissão inicial: 0%, ajustável no painel. Esse valor não representa uma condição comercial publicada.

## Próxima etapa de produção

1. Servidor, banco PostgreSQL e armazenamento de arquivos com backups separados.
2. Autenticação Google/email, verificação de email, autorização no servidor por perfil/vendedor e proteção administrativa.
3. Cadastro e verificação de vendedores, regras comerciais, anúncios e trilha de decisões.
4. Criar conta Woovi, validar a contratação para marketplace e só então integrar cobranças, webhooks com idempotência, estornos e repasses suportados pelo contrato.
5. Frete por origem do vendedor; a origem operacional da loja oficial fica na configuração interna, sem necessidade de exibí-la como destaque na interface.
6. Reserva de estoque, conciliação e confirmação de pagamento exclusivamente por eventos verificados no servidor.
7. Emails e push reais, páginas operacionais, suporte, observabilidade e ensaios de compra completa.

## Validação realizada

Testes automatizados do catálogo, imagens locais, busca/filtros, separação de carrinho por vendedor, validação de produto e arquivos PWA. Build de produção. Verificação visual no navegador em layout de celular e desktop; fluxo de sacola, acesso cliente, criação de pedido de teste, acessos vendedor/admin, edição de anúncio, aprovação/recusa de vendedor e persistência de comissão.

## Identidade oficial

A implementação local da identidade oficial usa a arte original fornecida, tokens de azul/navy, Exo 2 e Manrope, além de tipografia maior em todos os perfis. Consulte [o relatório de identidade](docs/identidade-visual.md) para escopo, validações e pendências. Esta atualização não foi publicada.

```sh
npm run check # lint + build de produção
```
