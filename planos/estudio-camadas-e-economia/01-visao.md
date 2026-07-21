# Camadas e economia: visão

## Parte 1: o editor que o usuário espera

Hoje o editor de carrossel edita texto, cores e troca imagem, mas não enxerga a peça como o usuário enxerga: um empilhado de camadas. O resultado prático apareceu no caso real do Jesse: aspas decorativas que não respondem a clique, imagens de página que o clique não alcança, e nenhum jeito de colocar uma imagem própria numa posição escolhida.

A experiência alvo:

1. Clicar em QUALQUER coisa visível seleciona essa coisa, inclusive enfeites (aspas, números de fundo, molduras). Se dois elementos se sobrepõem, o clique pega o menor sob o ponteiro, e clicar de novo no mesmo lugar alterna pros de trás.
2. Um painel de camadas ao lado do canvas lista os elementos do slide aberto, do mais alto pro mais baixo. Clicar na lista seleciona. Botões de subir e descer mudam a ordem visual de verdade.
3. Um botão "Adicionar imagem" insere uma imagem do computador ou das fontes de dados como elemento livre: nasce centralizada, arrastável, com largura ajustável e camada controlável (acima ou abaixo do que o usuário quiser).
4. No site, a mesma coisa adaptada à natureza da peça: a lista de seções que já existe ganha as ações de camada dentro da seção selecionada, e o mesmo "Adicionar imagem" (inserida na seção selecionada).

## Parte 2: gastar menos onde a inteligência não é necessária

Toda tarefa de IA do Hub hoje roda no modelo que o usuário escolher, com padrão Sonnet (Claude) ou GPT-5.4 mini (Codex). Mas as tarefas têm exigências muito diferentes:

- **Gerar uma peça do zero com design caprichado**: exige modelo forte. Não mexemos.
- **Ajustar algo pontual** ("troque o texto do topo", "deixe o botão maior"): o modelo barato resolve na grande maioria dos casos. O painel de Ajustar com IA passa a vir com o modelo barato pré-selecionado e uma dica honesta ("comece pelo barato; se o resultado não convencer, repita no maior"). A escolha manual continua.
- **Montar um carrossel quando o usuário já trouxe o roteiro**: aqui nasce o modo econômico. Se a pessoa escreveu nas instruções finais o conteúdo que quer, pedir pro Opus "criar" é desperdício: o trabalho é copiar o template e preencher. O Haiku faz isso por uma fração do custo.

### O interruptor "Aprimorar com IA"

Na etapa de instruções finais dos dois wizards entra um interruptor, LIGADO por padrão:

- **Ligado**: exatamente o fluxo de hoje. Nada muda em nenhum prompt.
- **Desligado**: a geração roda no modelo econômico do provedor (Haiku ou GPT-5.4 mini) com um prompt de MONTAGEM: siga o template ao pé da letra, use o conteúdo das instruções finais como fonte primária, não invente direção de arte, não redesenhe nada. O seletor de modelo da etapa 0 fica desabilitado com aviso do porquê.

Honestidade com o usuário embutida na UI: se o interruptor for desligado sem nenhum conteúdo nas instruções finais, a tela avisa que o resultado tende a ser básico, porque o modelo barato também vai escrever o texto. O modo econômico brilha quando o usuário traz o conteúdo.

### Por que isso não quebra a qualidade

1. O fluxo caprichado não é tocado: o modo econômico é um desvio explícito, escolhido pelo usuário, com expectativa ajustada na própria UI.
2. No carrossel, o contrato de template já existente (copiar `modelo-X.html` e preservar a anatomia) é ainda mais restritivo no modo econômico: o modelo barato tem MENOS liberdade, não mais.
3. No site, o modo econômico usa o degrau do meio (Sonnet no Claude, GPT-5.6 Terra no Codex), não o mínimo: site não tem template HTML pra copiar, a IA escreve do zero, e no mínimo absoluto a qualidade despenca. O corte de custo vem de pular a fase de direção de arte (usa um estilo fixo da biblioteca) e do modelo menor. O laço de conformidade continua auditando e mandando corrigir nos dois modos.
4. O QA compara lado a lado uma geração caprichada e uma econômica do mesmo tema e reporta a diferença com screenshots, pra decisão ser informada.

## Critério de fechamento

- No carrossel real do caso relatado (aspas com `pointer-events:none`, imagem de página atrás do texto), tudo é selecionável por clique e pela lista de camadas, num workspace de teste com uma cópia do template.
- Subir/descer camada muda a ordem visual, sobrevive a salvar e reabrir, e o desfazer restaura seleção e ordem.
- Imagem própria inserida, arrastada e salva persiste no HTML publicado do carrossel e do site.
- Interruptor desligado gera com o modelo econômico (confirmado no custos.json do workspace de teste) e o resultado respeita o template.
- Ajustar com IA abre com o modelo barato pré-selecionado nos dois provedores.
- Typechecks e testes verdes, 3 temas, CONTRATO.md e mapa atualizados.
