# Quadro vivo da rodada

Atualizar este arquivo ao abrir e ao fechar cada fase. Quem retoma a rodada lê daqui.

## Onde estamos

**Em andamento:** Fase 2b, o CRM subindo para o nível CORE.

A pesquisa do design system da Fase 5 fechou em 2026-07-27. O contrato completo está em `05-design-system.md`, com as provas em `provas-design/`. Nenhum arquivo de `app/` foi tocado: a implementação é uma rodada própria, e a Etapa 1 dela é o conserto da ordem da cascata do CSS, que hoje deixa a camada oficial de tema perder em sete telas.

A numeração mudou na rodada de 2026-07-27. O CRM virou uma fase própria, a 2, com etapas de 2a a 2e, porque a base estava vazia e reestruturar o dado agora custava zero. O desenho está em `04-crm-e-mensagens.md`.

## Quadro

| Fase | Estado | Versão | Fechou em |
|---|---|---|---|
| 0. Fundação do repositório | fechada | 1.0.0 | 2026-07-26 |
| 1. Amputação | fechada | 1.1.0 | 2026-07-26 |
| 1.5. Checkup e consertos | fechada | 1.2.0 | 2026-07-26 |
| 2a. Modelo do CRM versão 4 | fechada | 1.2.0 | 2026-07-27 |
| 2c. Buracos de uso do CRM | fechada | 1.2.0 | 2026-07-27 |
| 2b. CRM no nível CORE | em andamento | | |
| 2d. CRM ao vivo | fechada | 1.2.0 | 2026-07-27 |
| 2e. Mensagens e o chat | pendente | | |
| 3. Verdade do gasto | pendente | | |
| 4. HUB CORE completo | pendente | | |
| 5. Design system e nova pele | pesquisa fechada, implementação pendente | | |
| 6. Studio | pendente | | |

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

## Achados que já valem para as próximas fases

1. **Argumento multilinha quebra no Windows sob shell.** Provado em 2026-07-26. Quando o Claude é disparado por `.cmd` ou pelo fallback do PATH, um argumento com quebra de linha é cortado na primeira linha e o resto da linha de comando some junto, levando `--mcp-config` e `--allowedTools`. Some com o Modo enxuto, mas o contexto do CRM usa o mesmo caminho. Conserto na Fase 1.

2. **Teste que não testa.** O teste `combina modo enxuto e CRM` em `gerenciador.test.ts` nunca afirmou que a regra do Modo enxuto estava presente. Ele passaria com a injeção apagada. Serve de alerta: teste de injeção precisa afirmar o conteúdo injetado, não só o entorno.

3. **Provedor Claude sem cobertura.** Não existe `claude.test.ts`. A montagem de argumentos do provedor padrão nunca foi testada, enquanto o Codex tem fixture. Corrigir junto com a Fase 1.

4. **Sem template de workspace no repositório.** A pasta `VKOS/` é ignorada por construção. Ela existe na máquina do Jesse e vem do repositório `vkos`. Qualquer fase que mexa em criação de workspace precisa lembrar disso.

5. **Tipo duplicado é fronteira que não protege nada.** Provado em 2026-07-27 no CRM: o web tinha a própria cópia das entidades, o servidor subiu para a v4 e o typecheck do web continuou verde com a tela quebrada. Onde o web e o servidor falam do mesmo dado, tem que existir uma definição só, e a divergência tem que virar erro de compilação. Vale para o módulo de mensagens e para tudo que vier depois.

6. **A camada oficial de tema perde em produção.** Provado no build em 2026-07-27. `visual-hub.css` carrega por último em `main.tsx`, mas as 15 folhas de tela são importadas por componente, e sete delas entram por chunk lazy, que o Vite injeta como `<link>` depois. Mesma especificidade, quem chega depois vence. São 95 seletores e 181 pares de propriedade em que o `visual-hub.css` perde, nas telas Site, Studio, IDE, Conexões, Mapa, CRM e no painel de editor. Quem criar tela nova antes do conserto herda o mesmo bug. O conserto é `@layer base, tela, tema`, uma linha por arquivo, e é a Etapa 1 da Fase 5.

7. **Requisição de teste sem afirmar o status engole a falha.** Provado em 2026-07-27: um POST de interação com `tipo` inválido devolveu 400, o teste não conferiu o status e a falha só apareceu três passos adiante, como um `undefined` difícil de ler. Toda chamada de preparação afirma o status, não só a chamada que está sendo testada.
