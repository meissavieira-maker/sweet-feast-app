# Impressão automática da comanda

## Objetivo
Ao alterar um pedido de **Pendente** para **Preparando**, abrir automaticamente a impressão da comanda em formato térmico de **58 × 200 mm**.

## Implementação
- Disparar a impressão somente nessa mudança específica de status, após a atualização ser confirmada.
- Manter o botão de reimpressão manual em cada pedido.
- Redimensionar a via para 58 mm de largura, com limite de 200 mm, margens e tipografia compactas.
- Exibir mensagem clara se o navegador bloquear a janela de impressão.

## Validação
- Confirmar que outras mudanças de status não abrem a impressão.
- Confirmar que Pendente → Preparando abre uma única comanda.
- Conferir a prévia no tamanho 58 × 200 mm e validar o painel após a alteração.
