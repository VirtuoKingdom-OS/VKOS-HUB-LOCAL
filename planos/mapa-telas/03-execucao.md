# Execução: fases, ordem e checklist de fechamento

Rodada de 1 sessão de execução mais QA. As fases são sequenciais; cada uma termina com typecheck limpo.

## Fase 1: o dado e o servidor

1. Escrever `interno/mapa-telas.json` completo a partir do inventário do 01-visao: 5 zonas, 20 telas, ligações com gesto, 6 jornadas. Conferir cada rota contra `rotas.ts` antes de gravar (o código pode ter mudado desde a auditoria de 2026-07-21).
2. Em `app/server/src/mapa.ts`: schemas Zod (`MapaTelasSchema` e filhos), `lerMapaTelas()`, rota `GET /api/mapa/telas`. Validação `superRefine`: zonas existem, pontas de ligação existem, passos de jornada existem, ids únicos.
3. Teste de server: o JSON real passa no schema; JSON com ponta órfã ou jornada citando tela inexistente é recusado.

Critério de saída: `npm run checar` e `npm run testar` limpos no server; `curl /api/mapa/telas` devolve o mapa.

## Fase 2: a visão Telas

1. `TelaMapaTelas.tsx`: fetch lazy do dado, montagem do grafo (zonas em colunas, cartões `NoTela`, arestas estáticas com rótulo de gesto), painel lateral de detalhe, `onlyRenderVisibleElements`.
2. Seletor "Sistema | Telas" na `TelaMapa.tsx`. A visão Sistema continua o padrão e não muda em nada. Seletor só aparece quando `/api/mapa/telas` está disponível.
3. Botão Abrir: `hashDoDestino` com resolução dos destinos `@` via `usarEstado()` (peça de imagem mais recente, peça de site mais recente, primeiro tipo de fonte). Sem candidato: botão desabilitado com motivo no title e no painel. Destinos `null` (Splash, Servidor fora do ar, Onboarding, Geração flutuante): sem botão, painel explica quando o estado acontece.
4. Mini-esqueletos CSS: um bloco por chave (`dashboard`, `canvas`, `kanban`, `lista`, `wizard`, `editor`, `split`, `calendario`, `mapa`, `terminal`). Barras e blocos com tokens, nada de imagem.
5. Teste web `mapa-telas.test.ts`: round-trip de cada `destino` contra `telaParaHash`/`hashParaTela`.

Critério de saída: typecheck e testes do web limpos; visão abre, cartões legíveis nos 3 temas.

## Fase 3: jornadas e polimento

1. Chips de jornada (padrão visual do Percurso das skills). Selecionar: acende os nós do caminho no grafo com número de passo, atenua o resto, mostra a faixa horizontal de passos-mini. Desselecionar limpa tudo.
2. Motion: transições sutis de hover e seleção, `prefers-reduced-motion` vira none. Nenhuma animação contínua.
3. Subtítulo da tela Mapa atualizado pra citar as duas visões.

## QA (Playwright, build de produção, workspace de teste)

Roteiro mínimo:

1. Seletor aparece e alterna Sistema/Telas; a visão Sistema continua idêntica (modos discreto, skills e completo funcionando).
2. Os 20 cartões renderizam com nome, rota e esqueleto; painel lateral abre com detalhe e ligações.
3. Botão Abrir: `dashboard`, `cockpit`, `crm`, `criar:carrossel`, `setup` e `ide` navegam de verdade (hash muda e a tela certa monta). Destino `@peca` com workspace de teste contendo 1 peça abre o Studio; sem peça, botão desabilitado com motivo.
4. Jornada "Criar um carrossel" acende 3 passos numerados e atenua o resto; trocar de jornada troca o caminho; limpar volta ao normal.
5. Três temas: screenshot de cada, contraste confortável, nenhuma cor hardcoded.
6. Performance: sem animação contínua no canvas (zero `animateMotion`, zero keyframe rodando em idle).
7. Teardown: workspace de teste apagado.

Regra dura: nada de testar navegação em OJESSEGOMES ou Estúdio Aura.

## Checklist de fechamento

- [ ] `interno/mapa-telas.json` completo e validado pelo schema.
- [ ] Testes novos passando (server e web) e suíte inteira verde.
- [ ] Build de produção ok.
- [ ] `interno/mapa-sistema.json`: conferir o nó "mapa"; atualizar o resumo se não cobrir a visão Telas.
- [ ] `contexto/arquitetura.md`: seção do Mapa ganha um parágrafo sobre a visão Telas.
- [ ] `app/CONTRATO.md`: registro da rodada com data.
- [ ] `decisoes/`: registrar a decisão (dado em `interno/`, navegação por hash, sem screenshot) quando o Jesse aprovar o plano.
- [ ] Zero travessão e zero ponto mediano em tudo que foi escrito.
- [ ] Nenhum commit sem ordem do Jesse.
