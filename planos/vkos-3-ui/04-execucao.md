# VKOS 3.0 UI, execução

## Regras para quem executa

- Ler antes: `CLAUDE.md`, `contexto/visao.md`, `contexto/arquitetura.md`, os quatro arquivos deste plano e `interno/mapa-telas.json`.
- Português brasileiro em tudo. Sem travessão e sem ponto centrado: vírgula, ponto ou dois-pontos.
- NUNCA commit, push ou PR sem ordem explícita do Jesse.
- Toda cor por token: `global.css` é a base, `visual-hub.css` é a camada final por tema. Nenhuma cor nova fora deles.
- Dado real (`app/dados/`, workspaces) é sagrado. A varredura usa dados de teste, nunca apaga nem sobrescreve dado do Jesse.
- Cada fase fecha com `npm run checar`, `npm run testar` e `npm run build -w web` verdes, mais o critério da fase.
- O ambiente de validação está de pé: Postgres no Docker (`docker compose -f docker-compose.dev.yml up -d`), CORE na 4600 e hub na 4601 (ver README, seção Desenvolvimento). O smoke `npm run smoke:nuvem` precisa continuar verde ao fim de toda fase.
- Evidência visual é obrigatória: correção de UI sem screenshot de antes e depois não fecha.

## Fase 1: P0 (destravar o uso)

Corrigir os quatro itens de `01-diagnostico.md`: TelaAdmin no padrão `tela-fluxo`, causa raiz do CRM cinza mais error boundary global e por tela, scroll da tela de acesso, Acesso e Administração no `mapa-telas.json` com teste de rota.

Fecha quando: o ciclo completo (login com TOTP, admin, criar modelo, criar workspace, convite, CRM aberto) roda sem nenhuma tela quebrada, com screenshots provando.

## Fase 2: fundação do sistema

- Tokens de escala de `02-design.md` em `global.css` (espaço, raio, tipo, motion, z-index).
- Tema Claro off-white e ajustes do Escuro em `visual-hub.css`. Remoção do tema Dark VKOS com fallback de localStorage pro Escuro. Seletor de tema com duas opções.
- Camada de componentes comuns (botão, campo, cartão, aba, tabela, modal, aviso, toast, EstadoVazio, EstadoCarregando, EstadoErro, ErrorBoundary).
- Script `infra/varredura-ui.mjs` funcionando (screenshots automáticos, detecção de overflow e erro de console).

Fecha quando: os componentes comuns existem com os dois temas aplicados, o app inteiro abre nos dois temas sem regressão, e o script de varredura gera o primeiro lote de screenshots.

## Fase 3: varredura e modernização, tela a tela

Seguir a ordem de `03-varredura.md`. Uma tela por vez, ciclo completo (funciona, estados, responsividade, temas, sistema, motion), screenshots limpos antes de passar pra próxima. Migrar cada tela pros componentes comuns e apagar o CSS local que sobrar.

Fecha quando: todas as telas do mapa atualizado passaram no checklist com as 6 imagens limpas cada.

## Fase 4: acabamento e consistência final

- Passada de microinterações: foco, hover, transições de tela, toasts.
- Auditoria final automatizada: overflow, console limpo, contraste (rodar verificação de contraste nos pares de token dos dois temas), reduced-motion.
- Matriz final: smoke verde, testes verdes, build verde.

Fecha quando: a auditoria final passa inteira e o lote completo de screenshots está em `analises/varredura-ui/`.

## Fase 5: contexto em dia

- Atualizar CLAUDE.md, README, `app/CONTRATO.md` e `contexto/arquitetura.md`: dois temas, camada de componentes comuns, regra das quatro coisas de tela nova (tela-fluxo, mapa, teste de rota, error boundary).
- Atualizar `interno/mapa-telas.json` e `interno/mapa-sistema.json` com o estado final.
- Registrar em `decisoes/` qualquer escolha relevante feita durante a execução que não esteja neste plano.
- Anotar no CHANGELOG (3.0.0 em desenvolvimento) o bloco de UI.

Fecha quando: uma sessão nova lendo só o contexto entende o sistema de design sem abrir este plano.

## Fora de escopo deste plano

- Novas features ou mudanças de comportamento de negócio.
- Refazer o visual dos artefatos gerados (carrosséis, sites): a camada de design deles é outro contrato.
- Rebranding: logo, nome e menta continuam.
