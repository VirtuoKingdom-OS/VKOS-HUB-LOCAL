# Leads do formulário do site: o Supabase é caixa de entrada, o CRM é o funil

## Contexto

O site virtuokingdom.com.br ganhou um formulário de interesse com 9 perguntas de
qualificação. Cada envio vira uma linha na tabela `public.leads` de um projeto
Supabase, com uma coluna `temperatura` calculada pelo próprio banco a partir de
quem decide, do faturamento e do investimento. O Jesse queria ler isso no Hub em
vez de abrir o painel do Supabase.

Três coisas já existiam aqui e mudaram o tamanho do problema:

- **Conexões** já guarda segredo de serviço externo em `app/dados/conexoes.json`,
  no escopo CORE, e o servidor é quem fala com a API. A Apify já funciona assim.
- **Buscar leads** já faz mineração no Google Maps, marca duplicata por telefone
  E.164 e por `chaveExterna`, e tem a ação Importar que cria Contato.
- O **CRM** já tem funil com colunas: Não iniciados, Conversando, Proposta
  enviada, Fechado, Perdido.

Essa última é o problema. O briefing do formulário previa um campo `status` no
Supabase com novo, contatado, qualificado, proposta, fechado e perdido. É quase
a mesma lista das colunas do Quadro. Implementar os dois daria dois status pro
mesmo lead e nenhum seria o verdadeiro.

## Decisão

**O CRM manda no funil. O Supabase é caixa de entrada.**

O lead do formulário aparece numa aba nova do CRM, "Formulário". Desde
2026-07-30 ela é a segunda aba, logo depois de "Hoje", por pedido do Jesse:
quem preencheu levantou a mão sozinho, então é a primeira coisa a olhar depois
do dia. "Buscar leads" segue no fim, como porta outbound. As duas são as portas
de entrada do funil e as duas terminam criando Contato. Depois de importado, o estágio de
verdade é a coluna do Quadro, e só ela.

Quatro consequências que valem registrar:

1. **A divisão Novos / No funil sai do `crm.json`, não do status do Supabase.**
   Quem sabe se um lead já virou contato é a `chaveExterna`
   `formulario-site:<uuid>` no arquivo local. O status lá do outro lado é
   cortesia pra quem abrir o Supabase direto, e a rota trata a falha dessa
   escrita como aviso: o contato já está gravado e a chave já impede importar de
   novo.

2. **Não há cache local dos leads.** Diferente do `leads.json` da Apify, onde
   cada busca se paga por execução. Ler o Supabase é de graça e a tabela é a
   fonte da verdade do que chegou, então um cache só criaria uma segunda versão
   pra divergir.

3. **O retrato do formulário nasceu em `Contato.formulario`, separado de
   `Contato.lead`.** São duas origens com perguntas diferentes; espremer as duas
   num tipo só deixaria os dois vagos. `gatilho` e `tentativas` aceitam 2000
   caracteres, contra os 300 do resto, porque são a resposta aberta que mais
   serve na hora de ligar pra pessoa.

4. **A `service_role` nunca chega no navegador**, e isso saiu de graça da
   arquitetura que já existia: ela é campo secreto de uma entrada do catálogo,
   fica em `app/dados/conexoes.json` e só `server/src/formulario/supabase.ts` a
   lê. O frontend fala com `/api/formulario` e nunca com o Supabase.

## Por quê

Uma verdade só. O lead que preencheu o formulário é o mesmo lead que vai virar
cliente, e ele precisa conviver com o resto da operação: as interações, as
tarefas, o Hoje, o Quadro. Um painel autônomo teria sido mais rápido de fazer e
teria criado exatamente a segunda caixa de entrada paralela ao funil que o CRM
existe pra curar.

A alternativa do espelho bidirecional foi descartada pelo mesmo motivo. Ela
paga um preço permanente, dois funis pro mesmo lead, por um benefício que só
aparece se o Jesse abrir o painel do Supabase, que é justamente o que esta
rodada existe pra ele parar de fazer.

## A armadilha que isso quase pagou

`saneiaContato`, em `crm/migracao.ts`, reconstrói o contato campo a campo em
**toda leitura** do `crm.json`. Um campo que a normalização não conhece é
gravado com sucesso e some, sem erro nenhum, na leitura seguinte. O
`saneiaDadosLead` já vivia duplicado em `crm/estado.ts` e em `crm/migracao.ts`,
e um campo novo precisaria ser declarado nos dois.

Por isso o `saneiaDadosFormulario` nasceu em `crm/modelo.ts`, num lugar só, e os
dois arquivos o importam. E há um teste que grava um `crm.json` com o retrato,
manda pela normalização e afirma o conteúdo do outro lado. Ele foi conferido
apagando a injeção: sem a linha em `saneiaContato`, ele reprova.

## Onde isso mora

- `server/src/conexoes/catalogo.ts`: entrada `supabase`, campos `url` e
  `chaveServico`. O teste da conexão pergunta "esta chave lê a tabela leads", e
  não "a chave é válida", porque a chave `anon` passaria na segunda pergunta e
  devolveria lista vazia pra sempre sob RLS.
- `server/src/formulario/supabase.ts`: credenciais, leitura REST, normalização
  de snake_case pra camelCase e a escrita de cortesia do status.
- `server/src/formulario/rotas.ts`: `GET /api/formulario/leads` e
  `POST /api/formulario/importar`.
- `web/src/componentes/crm/LeadsFormulario.tsx` e a aba em `TelaCrm.tsx`.
- `web/src/componentes/crm/PainelContato.tsx`: a seção "Respostas do
  formulário" na ficha, pra importar não perder o que a pessoa contou.

## A tela é lista, não grade de cartões (2026-07-30)

Pedido do Jesse depois de ver a primeira versão, e ele está certo: isto é uma
**fila de contato**. O que decide a ordem de ligar é nome, temperatura e quando
chegou. Faixa de faturamento, dores e resposta aberta só importam depois que a
pessoa já escolheu quem atender, e com tudo aberto de uma vez três leads
enchiam a tela. A comparação, que é o trabalho de verdade, exigia rolagem.

Cada lead virou uma linha de 52px: nome, negócio como legenda na mesma linha,
quando chegou, temperatura, WhatsApp, Importar e um botão de expandir. Compacto
cabem doze na mesma altura. Tudo que qualifica mora no painel que abre.

Três detalhes que a lista exigiu e o cartão não exigia:

- **Coluna alinhada.** Tempo, temperatura e bloco de ações têm largura mínima e
  alinham à direita. Sem isso "ontem" ao lado de "há 2 dias" desalinhava a
  pílula de temperatura da linha seguinte, e o olho não conseguia descer a
  coluna.
- **Botão próprio de expandir, não linha inteira clicável.** A linha já tem três
  alvos (seleção, WhatsApp, Importar); clique ambíguo entre abrir e agir é pior
  que um alvo a mais. O botão tem 28px, acima do piso de 24 do critério 2.5.8, e
  carrega `aria-expanded` mais `aria-controls`.
- **A linha aberta sobe um degrau de superfície e segura o estado.** Enquanto o
  painel está aberto ela é o cabeçalho dele, não mais um item qualquer da lista.

## O que ficou de fora, de propósito

As métricas. As views `leads_metricas` e `leads_dores` existem no banco e não
foram consumidas: volume por dia, quebra de temperatura e ranking de dores ficam
pra uma rodada seguinte, quando o Jesse já souber o que ele olha todo dia. A
leitura tem teto de 500 leads por vez e a tela **avisa** quando ele é atingido,
porque corte silencioso se parece com "acabou".
