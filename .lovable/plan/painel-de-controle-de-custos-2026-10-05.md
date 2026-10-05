# Painel de controle de custos

## Objetivo
Adicionar uma aba **Custos** ao lado do PDV para registrar compras e despesas por mês, montar fichas técnicas e acompanhar o custo e a margem estimada de cada produto.

## O que será construído

### 1. Compras e insumos
- Cadastro de insumos e embalagens com unidade padrão.
- Lançamento de compras com data, fornecedor, observação e vários itens.
- Histórico organizado por mês, com edição e exclusão.
- Conversão automática entre **kg e g**, **L e ml** e uso por **unidade**.
- Atualização do custo médio ponderado de cada item a partir das compras lançadas.

### 2. Gastos de produção
- Cadastro por data e categoria, incluindo energia, gás, água, transporte, mão de obra e outros.
- Resumo mensal por categoria e total do período.
- Gastos gerais permanecerão no panorama mensal e poderão entrar nas fichas por um percentual de rateio opcional.

### 3. Receitas e fichas técnicas
- Cadastro de receita com rendimento e vínculo opcional a um produto da loja.
- Inclusão de ingredientes e embalagens com quantidade e unidade de uso.
- Cálculo automático de custo por ingrediente, custo direto total, rateio, custo final e custo por unidade.
- Comparação com o preço do produto: lucro estimado por unidade, margem e percentual de custo.
- Edição e exclusão das fichas cadastradas.

### 4. Panorama gerencial
- Filtro mensal e navegação entre meses.
- Indicadores de compras, despesas, custos totais e quantidade de fichas.
- Gráficos de evolução dos custos e distribuição por categoria.
- Ranking das receitas por custo e margem estimada.
- Avisos para itens sem preço de compra ou fichas incompletas.

## Segurança e dados
- Todos os registros serão privados e acessíveis somente por administradores.
- Serão criadas tabelas separadas para catálogo de itens, compras, itens comprados, despesas, receitas e componentes das receitas.
- Exclusões relacionadas serão tratadas com segurança para não deixar lançamentos órfãos.
- Os cálculos monetários serão centralizados no banco para manter resultados consistentes.

## Integração com o painel atual
- A nova aba ficará imediatamente ao lado do **PDV**.
- O visual seguirá o padrão atual do painel, adaptado para celular e desktop.
- O PDV continuará contando somente pedidos atualmente em **Preparando**; essa regra não será alterada.

## Validação
- Testar criação, edição e exclusão de itens, compras, despesas e receitas.
- Conferir conversões, custo médio, rendimento, rateio e margem com casos conhecidos.
- Validar privacidade administrativa, estados vazios e uso em celular e desktop.
- Corrigir também o erro de compilação já presente no tratamento global de falhas, necessário para liberar a validação final.