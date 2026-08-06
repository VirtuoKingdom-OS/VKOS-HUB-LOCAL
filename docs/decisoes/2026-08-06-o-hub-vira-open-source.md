# O Hub vira open source, sob AGPL

## Contexto

O repositório era privado e o código estava sob Business Source License 1.1,
decidido em 2026-07-26 (ver `2026-07-26-licenca-e-repositorio-proprio.md`). A
BSL declarava AGPL-3.0-or-later como Change License, com Change Date quatro
anos após a publicação de cada versão, e não concedia nenhum uso em produção
sem licença comercial escrita.

O Jesse quer abrir o código por duas razões, e as duas são de negócio, não de
ideologia:

1. **Credibilidade.** O Hub é o produto de uma pessoa só. Um repositório
   público, com o rigor de engenharia que o projeto já pratica à vista de
   todo mundo, vale mais como prova do que qualquer página de vendas.
2. **Os programas de open source da Anthropic e da OpenAI.** Eles dão crédito
   de uso por seis meses para projeto de código aberto, e o Hub queima crédito
   de IA por design. Entrar neles muda o custo de desenvolver.

O bloqueio era objetivo: a BSL 1.1 não é licença open source pelos critérios da
Open Source Initiative, porque restringe campo de uso. Nenhum dos dois
programas aceita ela. Trocar a licença não era opção, era o pré-requisito.

A tensão real é que o Jesse pode um dia lançar o Hub como SaaS. Uma licença
permissiva, MIT ou Apache-2.0, entregaria a qualquer um o direito de fazer
exatamente isso antes dele, com o trabalho dele, sem devolver nada.

## Decisão

**AGPL-3.0-or-later, com licenciamento duplo.**

O código passa a ser software livre sob a GNU Affero General Public License
versão 3 ou posterior, a partir de 2026-08-06, antecipando a Change Date que a
BSL previa. O texto oficial da FSF está em `LICENSE`, íntegro.

Em paralelo, o Jesse continua oferecendo licença comercial separada para quem
quiser construir serviço hospedado de código fechado em cima deste código. Isso
é possível porque ele detém o copyright da obra original, e não retira nada da
concessão da AGPL, que é permanente e irrevogável.

O que muda no repositório, na mesma rodada:

- `LICENSE` passa a ser o texto oficial da AGPL-3.0.
- `NOTICE` é reescrito, bilíngue: explica a AGPL em português claro, declara o
  licenciamento duplo, separa marca de código e registra o histórico de
  licença.
- `README.md` passa a ser em inglês, a porta de entrada para quem chega de
  fora, com `README.pt-BR.md` ao lado. `docs/ARCHITECTURE.md` e
  `docs/INSTALL.md` nascem em inglês pelo mesmo motivo.
- `SECURITY.md` ganha política de divulgação responsável de verdade, com canal
  privado e prazo assumido. `CODE_OF_CONDUCT.md` nasce com o Contributor
  Covenant 2.1.
- `CONTRIBUTING.md` passa a falar com contribuidor de fora, e exige DCO
  (`git commit -s`) em todo PR.
- `.github/` nasce com CI em Linux e Windows, CodeQL, Dependabot e os
  formulários de issue e de PR.
- `app/dados-backup-rodada8/` sai do rastreamento. Ela estava versionada por
  engano, com caminho da máquina do autor e transcrição de sessão com nome de
  cliente real dentro.
- Os caminhos absolutos da máquina do autor saem de `docs/`, trocados por
  `<raiz do repositorio>`.

## Por quê

**Por que AGPL e não MIT ou Apache-2.0.** As três são aprovadas pela OSI e as
três qualificam nos programas. A diferença está na seção 13 da AGPL: quem roda
uma versão modificada como serviço de rede precisa oferecer o código dela aos
usuários daquele serviço. Isso não impede ninguém de usar o Hub, inclusive
comercialmente, e não impede fork. O que ele impede é alguém pegar este código,
fechar por cima e vender como SaaS sem devolver nada. É a única das três que
protege o caminho de SaaS que o Jesse pode querer seguir.

**Por que licenciamento duplo.** Porque a AGPL protege o código mas afasta
empresa que não pode abrir a dela. A licença comercial é a porta para esse
caso, e ela é receita possível sem tirar nada de ninguém. É o caminho que
Grafana, Mattermost e Sentry seguiram, e ele já é entendido pelo mercado.

**Por que antecipar a Change Date em vez de esperar quatro anos.** Porque o
benefício é agora. Esperar quatro anos para virar AGPL sozinho não dá
credibilidade nenhuma hoje e não entra em programa nenhum hoje.

**Por que tornar público este repositório em vez de criar um limpo.** O
histórico tem as datas reais de trabalho, e projeto que nasce com um commit e
um dia de idade não passa a impressão de projeto vivo. O único conteúdo que
justificava reescrever histórico era a pasta de backup de dados, e ela é
pequena, antiga e sem segredo: caminho de máquina e transcrição de uma peça de
teste. Tirar do rastreamento daqui pra frente basta, e não custa reescrever
cinco commits.

**Por que o código continua em português.** Ele é a identidade do projeto e é
coerente com o público do produto, que é brasileiro e não é desenvolvedor.
Traduzir 100 mil linhas para agradar leitor de fora seria trocar coerência por
aparência. A documentação de entrada em inglês resolve o alcance sem pagar esse
preço.

**Por que DCO e não CLA agora.** CLA é atrito alto para um projeto que ainda
não tem contribuidor externo nenhum. O DCO é uma linha no commit e já registra
que quem contribuiu tinha o direito de contribuir. Se aparecer contribuição
externa relevante, o CLA entra, avisado com antecedência e nunca aplicado
retroativamente sem consentimento. Isso está escrito no `CONTRIBUTING.md`.

## O que esta decisão não muda

O produto continua local-first, continua sem telemetria e continua sem backend
hospedado. Abrir o código não abre dado de ninguém: `app/dados/`, os
workspaces e a pasta VKOS seguem fora do versionamento, como sempre estiveram.
A licença cobre o código e não concede direito sobre os nomes VKOS, VKOS Hub e
VirtuoKingdom, nem sobre as marcas visuais.
