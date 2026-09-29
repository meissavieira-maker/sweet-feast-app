# Painel PDV e gestão de vendas

## Objetivo
Adicionar ao Painel Admin uma aba **PDV**, ao lado de **Configurações**, com visão completa das vendas. Todos os números considerarão exclusivamente pedidos cujo status atual seja **Preparando**.

## O que será criado
- Filtro por período com atalhos para **Hoje**, **7 dias**, **30 dias** e intervalo personalizado.
- Resumo do período: faturamento, quantidade de pedidos, itens vendidos, ticket médio, entregas, retiradas e taxas de entrega.
- Comparação do faturamento e dos pedidos com o período anterior equivalente.
- Gráfico de vendas e pedidos ao longo do período.
- Gráfico por horário para identificar os horários de maior movimento.
- Ranking dos produtos mais vendidos, com quantidade, faturamento e participação nas vendas.
- Resumo por forma de atendimento e situação de pagamento.
- Tabela detalhada dos pedidos contabilizados no filtro escolhido.
- Atualização automática quando pedidos ou itens mudarem.
- Estados claros para carregamento, erro e períodos sem vendas.

## Regras
- Um pedido entra nos indicadores somente enquanto estiver com status **Preparando**.
- O filtro usa a data em que o pedido foi criado.
- Valores monetários incluem o total do pedido; o ranking de produtos usa preço unitário × quantidade.
- O painel permanece protegido pela mesma permissão administrativa existente.

## Detalhes técnicos
- A aba será integrada ao painel atual e usará os dados já disponíveis de pedidos e itens.
- Os gráficos serão feitos com a biblioteca já instalada no projeto e seguirão as cores atuais da loja.
- Datas e horários serão exibidos no horário da Bahia e valores em reais.
- Os filtros ficarão no endereço da página para preservar a seleção ao atualizar ou compartilhar o link.
