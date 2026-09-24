# Reimpressão de comandas no painel

## Objetivo
Adicionar em cada pedido um botão **Reimprimir comanda**, permitindo gerar novamente a via do pedido mesmo quando o cliente não enviar a mensagem pelo WhatsApp.

## Implementação
- Montar a comanda com número e data do pedido, cliente, telefone, entrega ou retirada, endereço, itens, valores, observações e total.
- Abrir uma versão limpa e própria para impressão ao clicar no botão.
- Acionar a janela de impressão do navegador, permitindo imprimir ou salvar em PDF.
- Manter a ação disponível individualmente em todos os pedidos do painel.

## Validação
- Abrir o painel com um pedido existente.
- Acionar **Reimprimir comanda** e confirmar que todos os dados aparecem corretamente na prévia de impressão.
- Conferir o painel em telas de computador e celular.
