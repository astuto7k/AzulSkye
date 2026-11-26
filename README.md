# AzulSkye

Loja oficial, marketplace por contato direto e oficinas parceiras. O frontend usa React e Vite. As funções em `api/` rodam na Vercel e acessam o Postgres e o Storage do Supabase com credenciais de servidor.

## Acessos

| Área | Endereço |
| --- | --- |
| Loja oficial | `/catalogo` |
| Negociação com parceiros | `/marketplace` |
| Entrar, criar conta ou recuperar senha | `/entrar` |
| Compras e solicitações do cliente | `/conta` |
| Cadastro e painel do vendedor | `/vender`, `/vendedor` |
| Diretório, cadastro e painel de oficinas | `/oficinas`, `/ser-oficina`, `/oficina` |
| Administração | `/admin` |
| Mapa de telas | `/telas` |

A conta usa e-mail como identificador, senha protegida com scrypt e sessão em cookie HTTP-only. O cadastro público cria um cliente. Aprovar uma parceria dá acesso às operações daquele parceiro. A permissão administrativa é provisionada no banco. Guarde o código de recuperação de uso único apresentado ao cadastrar ou trocar a senha. Os pedidos são vinculados à sessão da compra. Compras como visitante podem ser consultadas pelo comprovante no navegador de origem.

## Operação

- **Produtos** — gerencie estoque, preço, imagens, publicação e anúncios em análise. Os preços e a disponibilidade do checkout vêm do catálogo autorizado no servidor. A quantidade vazia em itens oficiais existentes representa disponibilidade sem saldo numérico cadastrado. Com saldo cadastrado, o checkout considera reservas ativas e o pagamento confirmado dá baixa uma vez.
- **Pedidos** — a loja oficial recebe por Pix ou cartão no site pelo Mercado Pago. O Pix exibe QR Code e copia e cola. O cartão usa campos seguros do Mercado Pago. O servidor confirma o pagamento com o provedor. O administrador acompanha os pedidos pagos até a retirada. Configure as instruções de retirada em `/admin/configuracoes`.
- **Marketplace e oficinas** — o comprador pode iniciar uma conversa no WhatsApp comercial publicado ou enviar uma solicitação no site. O parceiro responde pelo painel. Pagamento e entrega do marketplace são combinados entre comprador e vendedor.
- **Notificações** — abra o painel administrativo em HTTPS e ative os avisos no aparelho. No iPhone, adicione o site à tela inicial. O navegador precisa conceder a permissão. As chaves VAPID são geradas no servidor e ficam no banco com acesso restrito.

## Desenvolvimento e deploy

Use Node 22.12+ e instale com `npm ci`. Rode `npm test` e `npm run check`. Para testar frontend e APIs juntos, use `vercel dev` com uma base de desenvolvimento, as variáveis de `.env.example` e `APP_URL` correspondente à origem. A sessão utiliza cookie Secure. O preview estático do Vite serve somente os assets.

Aplique as migrações em ordem de dependência: `20261123_infinitepay.sql`, `20261123_store.sql`, `20261123_notifications.sql`, `20261123_official_inquiries.sql`, `20261123_sessions.sql`, `20261126_mercadopago.sql`. Em um banco novo, gere o SQL de importação inicial com `node scripts/seed-catalog.mjs` e execute no banco. A importação preserva os itens já cadastrados. Em produção, alterações de catálogo são feitas pelo painel e os cadastros ficam no Supabase.

O GitHub está conectado à Vercel. O build é `npm run build` com saída em `dist/`. Consulte `.env.example` para os nomes das variáveis privadas. A publicação atual usa retirada combinada e a conta Mercado Pago da loja oficial. Configure `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY` em produção e publique novamente após alterá-las. Cada cobrança inclui a URL de notificação do pedido. A API InfinitePay atende os pedidos anteriores.
