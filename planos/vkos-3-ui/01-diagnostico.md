# Diagnóstico dos bugs P0 (2026-07-22)

Encontrados no primeiro uso real do 3.0 pelo Jesse. Causa raiz investigada no código. Corrigir nesta ordem, antes de qualquer trabalho estético.

## P0.1: Administração renderiza quebrada, com o cockpit aparecendo atrás

**Sintoma**: abrir Administração mostra a página desmontada por cima do canvas do cockpit.

**Causa raiz confirmada**: toda tela fixa do Shell abre num `<section className="tela-fluxo ...">`, a classe que cobre o canvas por inteiro (ver `TelaCrm.tsx` linha 597, padrão de todas as telas). A `TelaAdmin.tsx` (linha 65) usa `<main className="admin-tela">` sem o `tela-fluxo`, então renderiza no fluxo normal do documento, sem cobrir o cockpit.

**Correção**: envolver a TelaAdmin no mesmo padrão das outras telas fixas (`section.tela-fluxo` com a classe própria dentro) e conferir que `admin.css` não redefine posicionamento que conflite. Validar navegando cockpit > admin > cockpit.

## P0.2: CRM abre tudo cinza e "fecha tudo"

**Sintoma**: abrir o CRM derruba a interface inteira pra uma tela cinza.

**Causa provável**: erro de runtime dentro da TelaCrm no ambiente 3.0 (modo core com banco e novo middleware). Como o app não tem error boundary, uma exceção em qualquer tela desmonta a árvore React inteira, sobrando só o fundo. Investigar com o console do navegador aberto: reproduzir, capturar o erro real e corrigir a causa.

**Correções, duas obrigatórias**:
1. A causa raiz do erro do CRM (reproduzir com devtools, corrigir o que estiver quebrando, provavelmente resposta da API em formato inesperado no modo novo).
2. **Error boundary global e por tela**: nenhuma exceção de uma tela pode derrubar o app. Adicionar um boundary no Shell em volta da área de telas com mensagem honesta e botão de tentar de novo. Isso é regra permanente, não band-aid deste bug.

## P0.3: Tela de acesso estoura a viewport sem scroll

**Sintoma**: no primeiro acesso (com o QR de TOTP visível), o conteúdo passa do tamanho da tela e não há como rolar.

**Causa raiz confirmada**: `acesso.css` linha 1: `.acesso { min-height: 100vh; display: grid; place-items: center; overflow: hidden; }`. O `overflow: hidden` existe pra recortar as órbitas decorativas, mas recorta o conteúdo junto quando o cartão cresce (o QR aumentou a altura). Sem scroll possível.

**Correção**: permitir scroll vertical no `.acesso` (ex.: `overflow-y: auto`) e recortar as decorações de outro jeito: `overflow: clip` só no eixo x, ou as órbitas dentro de uma camada própria `position: fixed; inset: 0; overflow: hidden; pointer-events: none`. Testar com o cartão no estado mais alto (bootstrap com QR) a 390x740.

## P0.4: telas novas fora do mapa

Acesso e Administração não existem em `interno/mapa-telas.json` (inventário parou nas 23 telas do 2.x). Adicionar as duas com zonas e ligações certas, porque a varredura do plano usa o mapa como inventário. Aproveitar e conferir se o hash `#/admin` está na gramática de rotas com teste de round-trip como os demais.

## Regra que nasce deste diagnóstico

Toda tela nova entra: (1) no padrão `tela-fluxo` do Shell, (2) no `mapa-telas.json`, (3) no teste de round-trip de rotas, e (4) embaixo do error boundary. As quatro coisas juntas, na mesma tarefa que cria a tela.
