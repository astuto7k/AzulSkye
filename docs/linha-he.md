# Linha HE — cadastro e publicação

Atualização autorizada pelo proprietário em 01/11/2026: declarar representante oficial HE, cadastrar quatro motores e priorizá-los frente às demais marcas. A alegação de representação foi fornecida pelo proprietário; nenhuma certificação adicional foi criada.

## Preços

USD confirmado no catálogo de referência Ready2Paramotor. Cotação usada: PTAX de venda de 30/10/2026, R$ 5,4212 por US$ 1, consultada no Banco Central: https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do

Fórmula: valor em USD × 5,4212 × 1,10. Arredondamento decimal HALF_UP para centavos; sem arredondamento comercial adicional, imposto ou frete acrescentado ao cálculo. Snapshot fixo, não atualização automática.

| Produto | Base USD | Preço BRL com 10% |
| --- | ---: | ---: |
| MV1 | 2.900,00 | 17.293,63 |
| MV2 | 3.100,00 | 18.486,29 |
| RS206 Performance | 3.900,00 | 23.256,95 |
| RS185 Performance | 3.400,00 | 20.275,29 |

As URLs de origem estão em `src/data/he-products.json`. A memória de cálculo também aparece em Admin → Configurações. Cadastros novos estão marcados como sob encomenda: disponibilidade da referência não foi tratada como confirmação de estoque local. Peso e dimensões não informados permanecem vazios.

## Apresentação

Fotos reais obtidas das URLs de produto enviadas, sem reconstruir ou alterar motores. Galerias MV1/MV2 com três imagens; RS206/RS185 com a imagem existente. Enquadramento via CSS, preservando a forma do produto. Tipografia oficial mantida. Hero, seção de destaque e footer identificam a representação HE.

Os quatro motores vêm antes das outras marcas em toda ordenação do catálogo. Menor preço, maior preço e A–Z são respeitados dentro de cada grupo; a interface informa essa prioridade. Filtro `marca=HE` permite consultar só a linha. Os 160 produtos originais permanecem intactos: total da loja oficial 164.

## Supervisão e acesso

`/telas` reúne 24 links, com seções loja/cliente, administrador e vendedor. Links diretos `/admin` e `/vendedor` aceitam carregamento e atualização da página, mantendo também as rotas hash legadas. Cada perfil pode ser aberto por um botão explicitamente demonstrativo. Isso não é autorização de servidor ou autenticação de produção.

Detalhes de pedido, notificações, edição de produto e checkout continuam como diálogos: a central informa como abrir cada um.

## Verificação

Build e lint aprovados; nove testes automatizados aprovados. Verificados no navegador: galeria, preços, seleção de menor preço com HE primeiro, entrada direta em admin/vendedor, central com 24 links, responsividade de celular e desktop, imagens sem falhas observadas e console sem erros capturados.

A publicação continua sendo uma prévia visual. Woovi, autenticação real, banco, frete e push não estão integrados nesta etapa.
