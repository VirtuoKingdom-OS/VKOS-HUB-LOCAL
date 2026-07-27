# Quadro vivo da rodada

Atualizar este arquivo ao abrir e ao fechar cada fase. Quem retoma a rodada lê daqui.

## Onde estamos

**Próxima fase:** Fase 5, o design system e a nova pele. A pesquisa e a Etapa 1 (a ordem da cascata) já fecharam; falta a implementação.

A Fase 4, o HUB CORE, fechou em 2026-07-27 na versão 1.4.0. O Hub passou a ter dois níveis de verdade: o CORE, do dono, e o workspace, do projeto aberto.

As fases 2 e 3 fecharam em 2026-07-27, na versão 1.3.0. O CRM foi reconstruído por inteiro: modelo v4, subida para o CORE, ao vivo, mensagens e o chat de três painéis. O gasto de IA foi medido com os CLIs de verdade e parou de mentir.

A pesquisa do design system e a Etapa 1 dela (a ordem da cascata) também fecharam. O resto da implementação é a Fase 5, depois do HUB CORE.

A numeração mudou na rodada de 2026-07-27. O CRM virou uma fase própria, a 2, com etapas de 2a a 2e, porque a base estava vazia e reestruturar o dado agora custava zero. O desenho está em `04-crm-e-mensagens.md`.

## Quadro

| Fase | Estado | Versão | Fechou em |
|---|---|---|---|
| 0. Fundação do repositório | fechada | 1.0.0 | 2026-07-26 |
| 1. Amputação | fechada | 1.1.0 | 2026-07-26 |
| 1.5. Checkup e consertos | fechada | 1.2.0 | 2026-07-26 |
| 2a. Modelo do CRM versão 4 | fechada | 1.3.0 | 2026-07-27 |
| 2c. Buracos de uso do CRM | fechada | 1.3.0 | 2026-07-27 |
| 2b. CRM no nível CORE | fechada | 1.3.0 | 2026-07-27 |
| 2d. CRM ao vivo | fechada | 1.3.0 | 2026-07-27 |
| 2e. Mensagens e o chat | fechada | 1.3.0 | 2026-07-27 |
| 3. Verdade do gasto | fechada | 1.3.0 | 2026-07-27 |
| 5, etapa 1. Ordem da cascata | fechada | 1.3.0 | 2026-07-27 |
| 4. HUB CORE completo | fechada | 1.4.0 | 2026-07-27 |
| 5. Design system e nova pele | pesquisa fechada, implementação pendente | | |
| 6. Studio | pendente | | |

## O que ainda não foi visto por olho humano

Isto não é ressalva de rodapé, é a maior dívida aberta da rodada. Os cinco portões não veem pixel, e as mudanças grandes mexeram em muita tela:

1. **A ordem da cascata** mudou o valor final de 98 seletores, todos previstos pela medição, nos três temas. Vale a passada em CRM, Site, Studio, Conexões, IDE e no painel do editor.
2. **O chat de três painéis e a ficha de contato.** A ficha teve 257 linhas extraídas para o `EditorNegocio` compartilhado. O typecheck cobre a costura, nada cobre o layout. Não existe teste de DOM neste projeto.
3. **A Sidebar em dois níveis e as duas telas novas do CORE.** A navegação inteira foi reorganizada: as seções Core e Workspace, o seletor de workspace mudando de lugar, o Dashboard do CORE e a tela de Workspaces, ambas com CSS novo. A lógica de formato e de leitura está coberta por 18 testes sem DOM; o layout, o espaçamento e o comportamento nos três temas não estão cobertos por nada. A série de barras de gasto e o cartão de workspace são os dois pontos que mais pedem olho.

## Fase 2 e 3, o que ficou pronto

- Modelo do CRM `versao: 4`, com interações e estágios em `.jsonl` append-only. Organização e Orçamento viraram entidades, coluna ganhou tipo semântico, negócio ganhou status e próxima ação.
- O CRM subiu para o nível CORE. Fusão dos CRMs de cada cliente com procedência preservada, coluna fundida por nome, id repetido desempatado, e nada apagado: a origem vira `.migrado-para-core`.
- Contato duplicado entre clientes NÃO é fundido automaticamente. A suspeita vira linha em `duplicatas-da-fusao.jsonl` e o dono decide.
- CRM ao vivo pelo WebSocket, com quatro guardas para a recarga não atropelar quem está digitando.
- O stream das sessões de IA deixou de ir em broadcast para todas as abas. O servidor decide o escopo agora, não o frontend.
- Módulo `mensagens/` com canal manual completo e contrato pronto para o WhatsApp. Conversa não existe sem contato.
- Chat de três painéis como aba do CRM, com o painel de contexto operando negócio e orçamento sem sair da conversa.
- O gasto de IA: o Codex reportava acumulado da thread e o Hub somava a cada retomada. Custo desconhecido nunca mais aparece como zero. Excluir cliente não apaga mais o gasto histórico.
- Fecha verde: 361 testes no server, 102 na web, dois typechecks e build.

## Fase 0, o que ficou pronto

- Repositório privado `OJESSEGOMES-VKOS/VKOS-HUB-LOCAL` criado.
- Branch `main` na linhagem local-first, de `bed8135`. Branch `arquivo/vkos-3-nuvem` guarda a tentativa de nuvem.
- Business Source License 1.1 com atribuição obrigatória em `NOTICE`.
- `CONTRIBUTING.md`, `SECURITY.md`, `README.md` e `CHANGELOG.md` reescritos.
- `.gitattributes` normalizando fim de linha, o que consertou 4 testes que quebravam por CRLF.
- Tag `v1.0.0`.

## Fase 1, o que ficou pronto

- Modo enxuto removido do produto inteiro: módulo, config, campo na sessão, toggle e CSS.
- Instruções extras da sessão passaram a viajar pelo stdin nos dois provedores. `montarArgsClaude` virou função exportada e ganhou o primeiro teste do provedor Claude.
- Automações, Calendário e a camada Google apagadas por inteiro, server e web.
- Conectores GitHub, Netlify, Notion e Google Calendar removidos. Sobrou só a Apify no catálogo.
- Publicação integrada virou exportação local: `POST /publicacao/:pasta/abrir-pasta` e `GET /publicacao/:pasta/exportar`. O conversor Astro, o motor de build e a auditoria ficaram intactos, e a barreira de qualidade continua bloqueando a exportação de site reprovado.
- `interno/mapa-sistema.json`, `interno/mapa-telas.json` e `app/CONTRATO.md` atualizados na mesma rodada.
- Fecha verde: 146 testes no server, 29 na web, dois typechecks e build.

Nota: o conversor Astro continua gerando `netlify.toml` dentro do projeto exportado, de propósito. Ele deixa o site pronto para o Jesse publicar à mão, com conta própria, sem nenhuma credencial passar pelo Hub.

## Fase 2a e 2c, o que ficou pronto

- Modelo `versao: 4`. Interações e histórico de estágio saíram do `crm.json` para `.jsonl` append-only, então registrar uma interação parou de reescrever a base inteira e de travar o event loop junto com as sessões de IA.
- Organização e Orçamento viraram entidades. Coluna ganhou `tipo` (aberto, ganho, perdido) e `diasParaEsfriar`. Negócio ganhou status, próxima ação, escopo e recorrência. Tarefa saiu de dentro do contato.
- Dois bugs vivos consertados: telefone normalizado em E.164 numa regra única do Hub, e a chave técnica saiu do campo editável `origem` para `chaveExterna`.
- A migração da v3 não descarta mais nada em silêncio. Negócio órfão é recuperado e deixa rastro em `recuperacoes.jsonl`.
- A fronteira de tipos entre web e servidor virou uma só definição, em `app/web/src/tipos/crm.ts`. Antes o web declarava a própria cópia das entidades, então a subida para a v4 passou no typecheck com a tela quebrada. Provado: renomear um campo no servidor gera 19 erros no `checar` do web, contra zero antes.
- Buracos de uso fechados: follow-up que resolve ao registrar interação, snooze com quatro presets, ação inline na tela do dia, o contador que mentia, funil separando aberto de ganho e perdido, apodrecimento por estágio que não dispara com próxima ação futura, Esc que salva em vez de descartar, busca cobrindo telefone e email, teclado no kanban e orçamento na ficha.
- `GET /crm/interacoes/ultimas` devolve o último toque de todos os contatos numa requisição, para o bloco "Esfriando" parar de chutar.
- Fecha verde: 281 testes no server, 53 na web, dois typechecks e build.

## Fase 2d, o que ficou pronto

- O CRM assina o WebSocket. Toda gravação solta `crm:atualizado`, só notificação, no padrão do `pecas:atualizadas`. Duas abas param de divergir sem F5.
- O escopo do aviso separa o funil do histórico, então registrar interação não faz a tela reler a base inteira. `origem` é o id da aba que gravou, e ela não recarrega por causa do próprio eco.
- A recarga fica guardada enquanto a pessoa está escrevendo num campo do CRM ou enquanto a gravação da própria aba está no ar. Adiar nunca perde a pendência, e a recarga de fundo nunca passa pelo estado de carregamento, que desmontaria a ficha aberta com tudo digitado nela.
- O plano previa `transmitirPara` para o CRM. Não é mais o certo: com o CRM no CORE, filtrar por workspace estaria errado. O aviso do CRM é broadcast, e `transmitirPara` foi para onde o vazamento realmente estava.
- Todo evento de sessão saiu do broadcast: `sessao:evento`, `sessao:status`, `sessao:conferencia` e `sessao:ferramenta` passaram a `transmitirPara`. Antes o stream cru do provedor, com o Cérebro e trechos de arquivo lido, chegava em qualquer aba e o filtro era do frontend. A aba declara o cliente no upgrade e redeclara por mensagem ao trocar, sem derrubar a conexão.
- Fecha verde: 307 testes no server, 62 na web, dois typechecks e build.

## Fase 2e, o que ficou pronto no servidor

- Módulo `server/src/mensagens/`. Conversas em `app/dados/crm/mensagens/`: `indice.json` para a coluna da esquerda e `conversas/<id>.jsonl`, uma conversa por arquivo, append-only. Dentro da pasta do CRM, com a mesma regra de `VKOS_DADOS_TESTE`, porque conversa é dado do CRM.
- O modelo nasceu com todos os campos que a integração real exige, do `idExterno` ao `payloadBruto`. Nenhum foi cortado: cada um evita migrar histórico de conversa depois.
- Conversa não existe sem contato, provado nos dois sentidos: criar sem contato é recusado, e chegar por identificador desconhecido cria o contato no CRM antes de abrir a conversa.
- Contrato de canal no espelho do contrato de provedor, com o canal `manual` completo. Envio assíncrono, template e webhook cabem no contrato sem estarem implementados, e cada método documenta o que não garante.
- Atualizar mensagem em arquivo append-only é linha nova com o mesmo id; a leitura colapsa por id e mantém a posição. Marcar como lida não toca na thread.
- Aviso ao vivo `mensagens:atualizadas`, broadcast, com escopo próprio e sem nenhum texto de mensagem dentro, provado com socket de verdade.
- Linha do tempo unificada da ficha em `GET /crm/contatos/:id/linha-do-tempo`, view sobre interações e mensagens, sem duplicar dado.
- Fecha verde: 337 testes no server (30 novos só de mensagens), 65 na web, dois typechecks e build.

## Fase 4, o que ficou pronto

- Dois níveis declarados no código, não só no menu: `TELAS_CORE` e `TELAS_WORKSPACE` em `layout/rotas.ts`, com teste travando quem mora onde e provando que abrir o Hub cai no Dashboard do CORE.
- Dashboard do CORE com o gasto de IA total (incluindo workspace já removido), declarado como piso quando falta preço, e a série de 14 dias com a comparação entre a semana corrente e a anterior. Barra de dia com turno sem preço sai listrada.
- Projetos ativos com critério declarado na tela: sessão em voo agora, ou trabalho nos últimos 7 dias. Abrir um workspace conta como trabalho, mesmo sem gastar IA.
- Tela de Workspaces nova, com o gasto e a atividade de cada projeto. O seletor da sidebar continua para a troca rápida, mas foi para dentro da seção Workspace.
- A tela de trabalho do projeto virou `#/inicio` (`componentes/workspace/TelaWorkspace.tsx`), e continua sendo a base do assistente de criação. Cancelar uma criação volta para lá, nunca para o CORE.
- Conexões subiu para `app/dados/conexoes.json`. Fusão no desenho do CRM, conflito virando anotação, origem preservada por rename, e nenhum valor de config no rastro.
- `GET /api/core/resumo` com a decisão isolada em `core/resumo.ts` e tipos compartilhados por ponte, com teste de fronteira travando a definição única.
- "Cliente" virou "Workspace" em toda a interface, no web e nas mensagens do servidor.
- Fecha verde: 385 testes no server (24 novos), 154 na web (52 novos), dois typechecks e build.

## Achados que já valem para as próximas fases

1. **Argumento multilinha quebra no Windows sob shell.** Provado em 2026-07-26. Quando o Claude é disparado por `.cmd` ou pelo fallback do PATH, um argumento com quebra de linha é cortado na primeira linha e o resto da linha de comando some junto, levando `--mcp-config` e `--allowedTools`. Some com o Modo enxuto, mas o contexto do CRM usa o mesmo caminho. Conserto na Fase 1.

2. **Teste que não testa.** O teste `combina modo enxuto e CRM` em `gerenciador.test.ts` nunca afirmou que a regra do Modo enxuto estava presente. Ele passaria com a injeção apagada. Serve de alerta: teste de injeção precisa afirmar o conteúdo injetado, não só o entorno.

3. **Provedor Claude sem cobertura.** Não existe `claude.test.ts`. A montagem de argumentos do provedor padrão nunca foi testada, enquanto o Codex tem fixture. Corrigir junto com a Fase 1.

4. **Sem template de workspace no repositório.** A pasta `VKOS/` é ignorada por construção. Ela existe na máquina do Jesse e vem do repositório `vkos`. Qualquer fase que mexa em criação de workspace precisa lembrar disso.

5. **Tipo duplicado é fronteira que não protege nada.** Provado em 2026-07-27 no CRM: o web tinha a própria cópia das entidades, o servidor subiu para a v4 e o typecheck do web continuou verde com a tela quebrada. Onde o web e o servidor falam do mesmo dado, tem que existir uma definição só, e a divergência tem que virar erro de compilação. Vale para o módulo de mensagens e para tudo que vier depois.

6. **A camada oficial de tema perde em produção.** Provado no build em 2026-07-27. `visual-hub.css` carrega por último em `main.tsx`, mas as 15 folhas de tela são importadas por componente, e sete delas entram por chunk lazy, que o Vite injeta como `<link>` depois. Mesma especificidade, quem chega depois vence. São 95 seletores e 181 pares de propriedade em que o `visual-hub.css` perde, nas telas Site, Studio, IDE, Conexões, Mapa, CRM e no painel de editor. Quem criar tela nova antes do conserto herda o mesmo bug. O conserto é `@layer base, tela, tema`, uma linha por arquivo, e é a Etapa 1 da Fase 5.

7. **Requisição de teste sem afirmar o status engole a falha.** Provado em 2026-07-27: um POST de interação com `tipo` inválido devolveu 400, o teste não conferiu o status e a falha só apareceu três passos adiante, como um `undefined` difícil de ler. Toda chamada de preparação afirma o status, não só a chamada que está sendo testada.

8. **Segredo que muda de escopo muda uma garantia de segurança.** Provado em 2026-07-27 com as conexões: subir o token da Apify para o CORE fez a garantia 3 do `SECURITY.md` ("excluir um workspace apaga os segredos dele") parar de descrever o produto. Toda mudança de escopo de dado sensível tem que reler o `SECURITY.md` na mesma tarefa, senão sobra uma garantia que promete o que o código não faz mais.
