# A conversa do Instagram mora no Hub

## Contexto

A rodada 1 do Instagram entregou leitura de métricas: perfil, alcance,
engajamento e as últimas doze publicações com os números de cada uma. A tela
lia, e era só. Clicar numa publicação abria o Instagram no navegador.

Isso deixava o trabalho pela metade. O número diz que houve trinta e sete
comentários; ele não diz o que as pessoas escreveram, e muito menos deixa
responder. Para agir, a pessoa saía do Hub, procurava a publicação de novo no
Instagram e respondia lá. O Hub virava um painel de leitura ao lado do trabalho
de verdade, em vez de ser o lugar do trabalho.

O pedido do Jesse foi direto: gerir o Instagram inteiro pelo Hub, começando por
abrir uma publicação e responder os comentários dela sem sair da tela.

## Decisão

**A tela do Instagram passa a ser o cockpit da conta, e não um relatório.**
Clicar numa publicação abre um painel lateral com a peça inteira, a legenda
inteira, os números e a conversa, com resposta ali mesmo.

Quatro escolhas concretas sustentam isso:

**1. Painel lateral, e não tela cheia.** A pessoa está varrendo a grade de
publicações e quer entrar numa, agir e voltar. Tela cheia perderia o lugar dela
na varredura, e a volta viraria navegação. O painel desliza da direita e deixa a
grade no lugar.

**2. A conversa NÃO passa pelo cache de uma hora.** As métricas continuam
cacheadas, porque o dado de insights da Meta atrasa até 48 horas e buscar de
novo não traz nada mais novo. Comentário é o contrário: o dono responde e
precisa ver a própria resposta na hora. Por isso `publicacao.ts` existe separado
de `metricas.ts`, com corte por temperatura do dado, e não por assunto.

**3. Toda ação relê a publicação inteira no servidor.** A resposta da Meta a um
POST traz só o id novo: sem o texto normalizado, sem horário e sem saber onde a
resposta caiu na árvore. Reler custa uma chamada e entrega a verdade, em vez de
um palpite remontado no navegador que diverge do que o Instagram vai mostrar.

**4. O escopo novo degrada com graça, e não quebra.** O Hub passou a pedir
`instagram_business_manage_comments`. Quem conectou antes disso tem um token sem
ele, e a Meta recusa só as chamadas de comentário. A publicação abre inteira do
mesmo jeito, e no lugar da conversa aparece o convite para reconectar. Falta de
autorização é estado da tela, não faixa vermelha de erro.

O que mais entrou: a foto da conta na capa, no lugar da inicial do arroba.

## Por quê

O critério que separou o que fica no cache do que não fica é a temperatura do
dado, e vale para qualquer integração futura. Número de insights é frio por
decisão da própria Meta, que só recalcula de tempos em tempos. Conversa é
quente por natureza. Misturar os dois no mesmo cache faria uma das duas coisas
erradas: ou gastaria cota buscando número que não mudou, ou mostraria uma
conversa de uma hora atrás, que é uma conversa perdida.

Sobre esconder e apagar comentário, os dois existem e nessa ordem de propósito.
Esconder é reversível: o comentário some para todo mundo menos para quem
escreveu, e dá para voltar atrás. Apagar não volta, e por isso ele arma antes
de agir, com a mesma mecânica de dois cliques que remover workspace usa.

**Mensagem direta continua fora, e agora está travada por teste.** Ela não é um
escopo a mais: é caixa de conversa, notificação de mensagem nova e a janela de
24 horas que a Meta impõe para responder. Isso é um produto, e vira rodada
própria quando for a hora. `oauth.test.ts` afirma que a autorização não pede o
escopo de mensagens, para que incluir ela seja escolha registrada e não deslize.

**Publicar post e carrossel entrou logo em seguida**, no mesmo dia, depois que a
decisão que faltava foi tomada: como o arquivo local vira uma URL pública, já
que a Meta exige isso para imagem e carrossel. Ver
`docs/decisoes/2026-08-05-publicar-no-instagram.md`.

## O conserto que veio logo depois, e a lição dele

Reconectar não estava reconectando. O Jesse reconectou a conta, o Hub disse
conectado, e a Meta continuou recusando os comentários.

A causa: a URL de autorização não pedia `force_reauth`. Sem ele, quem já
autorizou o app antes volta com o código na hora, sem ver tela nenhuma, e a Meta
**reaproveita o consentimento antigo**. O token sai novo e com os escopos
velhos. O defeito é silencioso por construção: tudo parece ter dado certo.

Duas correções saíram disso:

**A autorização passa a forçar o consentimento.** A tela de permissão aparece
toda vez, e o escopo novo é de fato pedido. O custo é um clique a mais numa ação
que se faz a cada dois meses.

**O Hub para de adivinhar o que a conexão pode fazer.** A Meta já devolvia, na
troca do código, o campo `permissions` com o que foi **concedido**, e esse campo
estava sendo jogado fora. Agora ele é gravado, e o card de Conexões avisa quando
a autorização não inclui os comentários, em vez de deixar a pessoa descobrir num
painel que abre sem eles.

A lição que fica, e que vale para qualquer OAuth que o Hub adicionar depois:
**pedir um escopo não é o mesmo que receber ele.** Todo fluxo de autorização
deve gravar o que o provedor respondeu, e a tela deve falar a partir disso, e
não a partir do que o código pediu.

## A parede que apareceu no teste real, e que nenhum código resolve

Com o escopo concedido e o `force_reauth` corrigido, os comentários **continuaram
não vindo**. O diagnóstico contra a conta real, em 2026-08-05:

| publicação | a Meta diz | veio | erro |
|---|---|---|---|
| 18083618279242432 | 8 | 0 | nenhum |
| 18347384197168156 | 3 | 0 | nenhum |
| 18175757059412206 | 31 | 0 | nenhum |
| 18067887578624151 | 1 | 0 | nenhum |

Nenhuma variação de `fields` muda o resultado, e pedir `comments{}` no nó da
mídia faz a Meta **omitir o campo inteiro** em vez de recusar. Sem erro, sem
código de permissão, com `paging` presente e `data` vazio.

**A causa é o modo de desenvolvimento do app na Meta.** Dado agregado passa
(`comments_count` vem certo), conteúdo escrito por quem não tem papel no app não
passa. Os comentários são de pessoas comuns, que não são testadoras do app
IGVKOS, e ler dados delas exige Advanced Access, que só sai por App Review.

Isso corrige uma afirmação errada que foi dita ao Jesse antes de existir teste
real: que comentários e mensagem direta seriam desenvolvíveis sem App Review por
ser a conta dele. A conta é dele; **os comentários são dos outros**, e é isso que
a Meta separa.

O que fica de aprendizado, e vale para a próxima integração: **escopo concedido
não é capacidade disponível.** Entre os dois existe o modo do app, e o único
jeito de saber é chamar de verdade e olhar o que volta.

A tela passou a dizer isso em vez de mentir. Quando o total é maior que zero e a
lista vem vazia, o painel mostra quantos existem e explica por que não dá para
ler, em vez do "nenhum comentário ainda" que estava tecnicamente escrito e
factualmente errado.

**Publicar não é afetado**, e isso não é palpite: ali quem age é a conta do
próprio dono, que tem papel no app.

## O que isto não muda

Nada de multi-conta. A conexão continua sendo uma só, no nível CORE, da conta do
dono. Publicar ou responder pela conta de um cliente que não é tester do app
Meta exige App Review, e isso continua sendo decisão de produto por tomar, do
jeito que `docs/planos/instagram/01-visao.md` já registrou.

O `interno/mapa-sistema.json` foi conferido: ele não representa o Instagram como
nó, então não há ligação a atualizar. Nenhum módulo nasceu, morreu ou trocou de
responsabilidade: `instagram/` continua sendo o dono da conversa com a Meta, e
passou a escrever além de ler.
