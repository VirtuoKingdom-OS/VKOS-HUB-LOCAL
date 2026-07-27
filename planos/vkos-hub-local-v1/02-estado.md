# Quadro vivo da rodada

Atualizar este arquivo ao abrir e ao fechar cada fase. Quem retoma a rodada lê daqui.

## Onde estamos

**Próxima fase:** Fase 2, Verdade do gasto.

## Quadro

| Fase | Estado | Versão | Fechou em |
|---|---|---|---|
| 0. Fundação do repositório | fechada | 1.0.0 | 2026-07-26 |
| 1. Amputação | fechada | 1.1.0 | 2026-07-26 |
| 1.5. Checkup e consertos | fechada | 1.2.0 | 2026-07-26 |
| 2. Verdade do gasto | pendente | 1.2.0 | |
| 3. HUB CORE | pendente | 1.3.0 | |
| 4. Nova pele | pendente | 2.0.0 | |
| 5. Studio | pendente | 2.1.0 | |

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

## Achados que já valem para as próximas fases

1. **Argumento multilinha quebra no Windows sob shell.** Provado em 2026-07-26. Quando o Claude é disparado por `.cmd` ou pelo fallback do PATH, um argumento com quebra de linha é cortado na primeira linha e o resto da linha de comando some junto, levando `--mcp-config` e `--allowedTools`. Some com o Modo enxuto, mas o contexto do CRM usa o mesmo caminho. Conserto na Fase 1.

2. **Teste que não testa.** O teste `combina modo enxuto e CRM` em `gerenciador.test.ts` nunca afirmou que a regra do Modo enxuto estava presente. Ele passaria com a injeção apagada. Serve de alerta: teste de injeção precisa afirmar o conteúdo injetado, não só o entorno.

3. **Provedor Claude sem cobertura.** Não existe `claude.test.ts`. A montagem de argumentos do provedor padrão nunca foi testada, enquanto o Codex tem fixture. Corrigir junto com a Fase 1.

4. **Sem template de workspace no repositório.** A pasta `VKOS/` é ignorada por construção. Ela existe na máquina do Jesse e vem do repositório `vkos`. Qualquer fase que mexa em criação de workspace precisa lembrar disso.
