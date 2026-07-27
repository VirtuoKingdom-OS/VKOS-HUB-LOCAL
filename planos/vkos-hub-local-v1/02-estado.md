# Quadro vivo da rodada

Atualizar este arquivo ao abrir e ao fechar cada fase. Quem retoma a rodada lê daqui.

## Onde estamos

**Em andamento:** Fase 2b, o CRM subindo para o nível CORE. Em paralelo, a pesquisa do design system da Fase 5.

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
| 2d. CRM ao vivo | pendente | | |
| 2e. Mensagens e o chat | pendente | | |
| 3. Verdade do gasto | pendente | | |
| 4. HUB CORE completo | pendente | | |
| 5. Design system e nova pele | pesquisa em andamento | | |
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

## Achados que já valem para as próximas fases

1. **Argumento multilinha quebra no Windows sob shell.** Provado em 2026-07-26. Quando o Claude é disparado por `.cmd` ou pelo fallback do PATH, um argumento com quebra de linha é cortado na primeira linha e o resto da linha de comando some junto, levando `--mcp-config` e `--allowedTools`. Some com o Modo enxuto, mas o contexto do CRM usa o mesmo caminho. Conserto na Fase 1.

2. **Teste que não testa.** O teste `combina modo enxuto e CRM` em `gerenciador.test.ts` nunca afirmou que a regra do Modo enxuto estava presente. Ele passaria com a injeção apagada. Serve de alerta: teste de injeção precisa afirmar o conteúdo injetado, não só o entorno.

3. **Provedor Claude sem cobertura.** Não existe `claude.test.ts`. A montagem de argumentos do provedor padrão nunca foi testada, enquanto o Codex tem fixture. Corrigir junto com a Fase 1.

4. **Sem template de workspace no repositório.** A pasta `VKOS/` é ignorada por construção. Ela existe na máquina do Jesse e vem do repositório `vkos`. Qualquer fase que mexa em criação de workspace precisa lembrar disso.

5. **Tipo duplicado é fronteira que não protege nada.** Provado em 2026-07-27 no CRM: o web tinha a própria cópia das entidades, o servidor subiu para a v4 e o typecheck do web continuou verde com a tela quebrada. Onde o web e o servidor falam do mesmo dado, tem que existir uma definição só, e a divergência tem que virar erro de compilação. Vale para o módulo de mensagens e para tudo que vier depois.

6. **Requisição de teste sem afirmar o status engole a falha.** Provado em 2026-07-27: um POST de interação com `tipo` inválido devolveu 400, o teste não conferiu o status e a falha só apareceu três passos adiante, como um `undefined` difícil de ler. Toda chamada de preparação afirma o status, não só a chamada que está sendo testada.
