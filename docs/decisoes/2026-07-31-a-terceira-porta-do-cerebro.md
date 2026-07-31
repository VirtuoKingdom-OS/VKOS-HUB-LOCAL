# A terceira porta do Cérebro: soltar um .md

## Contexto

O cockpit vazio oferecia dois caminhos pra montar o Cérebro: a entrevista
guiada (`/instalar`) e escrever à mão no painel. Os dois pedem que a pessoa
responda 13 blocos.

Falta o caso mais comum de quem já vende: **o negócio já está escrito em algum
lugar.** Um documento de posicionamento, um briefing de agência, um resumo que
a pessoa mandou pro contador. Fazer ela digitar de novo o que já existe é
trabalho repetido, e é o tipo de atrito que faz alguém abandonar a instalação
na terceira pergunta.

## Decisão

O cartão de boas-vindas do cockpit ganha uma terceira porta: soltar um `.md`.
Soltar já envia, sem passo de confirmação.

Ela **não substitui a entrevista, ela a encurta.** O arquivo sobe pro
workspace, a cerimônia abre já rodando, lê o documento, preenche o que der e
conduz a entrevista só pelos blocos que ficaram em branco.

### O que NÃO foi feito, e por quê

Não gravamos o `.md` por cima do `cerebro/cerebro.md`. Seria uma linha de
código e estaria errado: o Cérebro tem uma forma, 13 blocos que todas as skills
leem por nome, e um documento qualquer não tem essa forma. Pior, a heurística
de "preenchido" é a ausência do marcador `✍️`, então qualquer markdown sem esse
caractere passaria por Cérebro completo e o negócio inteiro geraria em cima de
um documento que ninguém conferiu.

### O que foi reaproveitado, e por quê

Nada de servidor foi escrito. Duas peças já existiam e já faziam exatamente o
necessário:

- **O módulo `anexos`** já recebe arquivo, sanitiza o nome, recusa extensão
  fora da lista (`.md` já estava lá), grava em
  `materiais/cockpit/anexos/<data>/` dentro do VKOS e devolve o caminho
  relativo. A sessão roda com `cwd` na pasta do VKOS, então esse caminho é
  exatamente o que o prompt precisa citar.
- **A skill `/instalar`** já manda aproveitar material que existe no workspace
  antes de perguntar. O prompt daqui não reimplementa a entrevista, ele diz por
  onde começar.

O prompt vai inteiro pelo **stdin** do provedor, então pode ser multilinha: a
proibição de valor multilinha do projeto vale pra ARGUMENTO de processo filho,
que não é o caso.

## O alvo é clicável antes de ser área de arraste

Arrastar arquivo não existe pro teclado nem pro toque. Uma porta que só abre
por arraste é uma porta que parte das pessoas não consegue abrir, então a área
é `role="button"` com `tabIndex` e abre o seletor de arquivo no Enter e no
espaço. O tracejado só aparece com um arquivo passando por cima, que é o único
lugar do sistema onde ele quer dizer alguma coisa.

## As travas

O prompt saiu do `.tsx` e virou `cockpit/cerebroDocumento.ts` justamente pra
poder ser testado: ele é **injeção de conteúdo num processo de IA**, e a regra
da casa é que teste de injeção afirma o conteúdo injetado, não só o entorno.
`cerebroDocumento.test.ts` trava cinco coisas:

- o caminho do arquivo aparece literal no prompt;
- a primeira linha é `/instalar` sozinha (no Codex o expansor de skills só
  reconhece o comando quando ele ocupa a linha inteira);
- o prompt manda ler antes de perguntar e proíbe inventar;
- o caminho do documento não vira invocação de skill por acidente;
- só `.md` abre a porta.

## Conferido

Numa instância isolada (`VKOS_DADOS_TESTE` + `VKOS_PORT=4712`) com um VKOS
vazio, nos dois temas. O `POST /api/sessoes` foi interceptado de propósito: o
objetivo era provar que o prompt certo sai daqui, não gastar uma sessão de IA.

- O cartão mostra as três portas, o alvo mede 370x114 e é alcançável por
  teclado.
- Soltar um `.pdf` mostra o erro e **não cria sessão nenhuma**.
- Soltar o `.md` grava o arquivo no workspace com o conteúdo intacto, e o
  prompt capturado cita o caminho exato que o servidor devolveu, inclusive o
  sufixo `-2` do desempate de nome.
