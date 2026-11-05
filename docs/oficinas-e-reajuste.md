# Oficinas parceiras e reajuste — 05/11/2026

## Catálogo

Aplicado +5% sobre os preços em reais publicados, arredondando para centavos. Foram alterados 163 preços (159 do catálogo original + 4 HE); o produto sem preço continua sob consulta. A prioridade HE permanece. Preços de anúncios demonstrativos de terceiros não foram reajustados. Pedidos já persistidos no navegador conservam seus valores históricos.

Cada produto guarda o registro do reajuste (`catalog-2026-11-05-plus5`) com valor anterior, percentual, data e novo preço, impedindo ambiguidade sobre a base utilizada. Preços HE atuais: MV1 R$ 18.158,31; MV2 R$ 19.410,60; RS206 R$ 24.419,80; RS185 R$ 21.289,05. A memória de cálculo no painel administrativo foi atualizada.

## Quarto perfil: oficina parceira

- Acesso demonstrativo: `oficina@azulskye.demo`, senha `AzulDemo123!`.
- `/oficinas`: diretório filtrável por nome/localização e especialidade.
- `/ser-oficina`: cadastro de empresa/CNPJ ou profissional/CPF, responsável, email de teste, cidade, forma de atendimento, especialidades e apresentação.
- `/oficina`: visão geral do parceiro.
- `/oficina/perfil`: perfil e serviços; alterações retornam à análise.
- `/oficina/solicitacoes`: manutenção recebida e acompanhamento de etapa.
- `/admin/oficinas`: aprovar, recusar ou suspender cadastros e supervisionar solicitações.

Somente perfis aprovados aparecem no diretório. Perfil inicial é explicitamente demonstrativo, sem credenciamento real. Cadastros novos são pendentes. Clientes podem registrar uma solicitação de teste; a oficina acompanha somente as suas e o administrador visualiza todas. A navegação `/telas` inclui os novos destinos.

A migração do estado local acrescenta oficinas e solicitações sem apagar carrinho, favoritos, cadastros ou pedidos existentes. Os quatro acessos continuam demonstrativos; não há autenticação de servidor, contato enviado ou banco real conectado.

## Banco recomendado

Manter frontend na Vercel e usar Supabase: PostgreSQL para cadastros/produtos/pedidos/serviços, Auth para os quatro perfis e Storage para imagens. Preferir região São Paulo (`sa-east-1`) para o público brasileiro. Autorização por proprietário e perfil deve ser implementada no servidor e em políticas de acesso aos dados; o administrador controla aprovações, sem permissão de autoaprovação por vendedores ou oficinas.

Próxima etapa: criar o projeto Supabase, configurar autenticação, modelar permissões, importar o catálogo revisado e migrar armazenamento local para dados persistentes. Nenhuma conta, assinatura ou serviço de banco foi criado nesta alteração.

Fontes consultadas em 05/11/2026:
- https://vercel.com/integrations/supabase
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/pricing (Pro a partir de US$ 25/mês; cobrança conforme plano e uso)

## Validação

Lint, build e 13 testes: catálogo, preços, ordenação HE, acesso por perfil, especialidades, separação de solicitações e rotas. Teste no navegador: cadastro CPF com Motores/Velas, aprovação pelo administrador, publicação no diretório, solicitação de cliente, recebimento pela oficina e alteração de etapa. Layout de celular e desktop conferido; verificação de persistência após recarregar. Publicação via GitHub/Vercel autorizada pelo fluxo já estabelecido.
