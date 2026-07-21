# Arquitetura: dado, rota, componente e navegação

Princípio: mesma receita do mapa do sistema, que já provou funcionar. Dado curado em `interno/`, servido com validação, desenhado com React Flow, sem tocar em nenhum comportamento do app.

## 1. O dado: `interno/mapa-telas.json`

```json
{
  "versao": 1,
  "zonas": [{ "id": "entrada", "nome": "Entrada e boot", "cor": "suave" }],
  "telas": [
    {
      "id": "dashboard",
      "zona": "hub",
      "nome": "Dashboard",
      "rota": "#/dashboard",
      "destino": "dashboard",
      "resumo": "Porta de entrada do cliente ativo.",
      "descricao": "Texto longo pro painel lateral.",
      "estados": ["botões de criação", "resumo do cliente"],
      "esqueleto": "dashboard"
    }
  ],
  "ligacoes": [
    { "de": "dashboard", "para": "criar-carrossel", "gesto": "clica em Criar carrossel" }
  ],
  "jornadas": [
    {
      "id": "criar-carrossel",
      "nome": "Criar um carrossel",
      "cor": "menta",
      "passos": ["dashboard", "criar-carrossel", "studio"]
    }
  ]
}
```

Campos que pedem atenção:

- `destino`: o alvo de navegação do botão Abrir, na gramática de telas do Shell (`dashboard`, `criar:carrossel`, `fluxo:site`...). Campos especiais: `"setup"` (vira `#/setup`), `"ide"` (hash legado), `null` pra estado sem navegação direta (Splash, Servidor fora do ar, Onboarding, Geração flutuante): o botão não aparece e o painel explica quando o estado acontece.
- `destino` parametrizado: `"studio:@peca-imagem"`, `"site:@peca-site"`, `"fonte:@fonte"`. O prefixo `@` diz ao front que precisa resolver um parâmetro no cliente ativo (peça de imagem mais recente, peça de site mais recente, primeiro tipo de fonte presente). Sem candidato, botão desabilitado com o motivo.
- `esqueleto`: chave de um mini-desenho CSS pré-definido no front (`dashboard`, `canvas`, `kanban`, `lista`, `wizard`, `editor`, `split`, `calendario`, `mapa`, `terminal`). O dado escolhe a chave, o front desenha. Tema-aware de graça porque é CSS por token.
- `jornadas[].passos` referenciam ids de telas; repetição permitida dentro de uma jornada (didática vence).

## 2. O servidor: schema e rota

Em `app/server/src/mapa.ts` (mesmo módulo do mapa do sistema):

- `TelaMapaSchema`, `LigacaoTelasSchema`, `JornadaSchema`, `MapaTelasSchema` com Zod. `superRefine` valida: zona existe, pontas das ligações existem, passos das jornadas existem, ids únicos.
- `lerMapaTelas()` lê `interno/mapa-telas.json`, mesmo tratamento de erro do `lerMapaSistema` (arquivo ausente ou inválido vira indisponível, nunca derruba).
- Rota `GET /api/mapa/telas` responde `{ disponivel, mapa }`.

Nada mais muda no server. Zero impacto em sessões, custos, workspaces.

## 3. O front: visão nova dentro da TelaMapa

`app/web/src/componentes/mapa/` ganha `TelaMapaTelas.tsx` (a visão) e a `TelaMapa.tsx` vira o chapéu com o seletor:

- **Seletor "Sistema | Telas"** no `mapa-topo`, padrão visual do grupo `mapa-modos`. Estado local `visao: "sistema" | "telas"`. A visão Telas só busca `/api/mapa/telas` quando aberta pela primeira vez (lazy). Se indisponível, o seletor nem aparece: o Mapa continua exatamente como hoje.
- Os controles atuais (Títulos, Descrições, Discreto, Percurso das skills, Mapa completo) pertencem à visão Sistema e somem na visão Telas. A visão Telas tem os próprios controles: chips de jornada e um botão "Ver tudo" (fitView).

### O nó de tela

Componente `NoTela` registrado como tipo novo no React Flow da visão:

- Cartão maior que o nó do sistema (~300px): tag da zona, mini-esqueleto (bloco CSS de ~120px de altura), nome, rota em monoespaçada, resumo curto, lista compacta de estados (até 4, "+n" pro resto), botão "Abrir".
- Selecionado abre o painel lateral (mesmo padrão do mapa atual): descrição longa, estados completos, "Chega por aqui" e "Sai por aqui" (ligações com gesto), botão Abrir grande.
- Nó de passo de jornada (repetição didática): versão mini do cartão, só nome e número do passo, posicionada na faixa da jornada. Gerado do dado, não curado à mão.

### Navegação do botão Abrir

Só hash, sem prop drilling e sem tocar no Shell:

```ts
function abrirTela(destino: string) {
  window.location.hash = hashDoDestino(destino);
}
```

`hashDoDestino` resolve os `@`: pega de `usarEstado()` a peça de imagem mais recente (studio), a peça de site mais recente (site), o primeiro tipo de fonte (fonte). O `hashchange` do Shell faz o resto, que é exatamente o caminho que o botão Voltar do navegador já usa. Nenhuma API nova, nenhuma mudança de contrato de navegação.

Caso especial IDE: `window.location.hash = "#/ide"` já é tratado pelo Shell (compatibilidade legada) e abre a camada. Usar esse caminho como está.

### Layout do canvas

- Zonas como colunas, na ordem de uso (Entrada > Hub > Conteúdo > Criação > Edição). Posição calculada por zona e índice, mesmo algoritmo do `montarVisual` atual, com espaçamento maior (cartões maiores).
- Faixa de jornadas abaixo do grafo principal: quando uma jornada está selecionada, os nós de passo aparecem em linha horizontal com as setas numeradas, e no grafo principal os nós correspondentes acendem. Desselecionar limpa.
- Arestas: tipo estático com rótulo de gesto (reaproveita `LigacaoNeural` com `semPulso` ou um tipo próprio mais simples). Sem tracejado animado, sem drop-shadow, sem pulso em massa: o mapa de telas nasce leve. `onlyRenderVisibleElements` ligado.

## 4. Teste que impede o mapa de mentir

Teste unitário no web (`mapa-telas.test.ts`): importa o JSON (via fixture ou fetch mockado) e valida cada `destino` contra a gramática real de `rotas.ts`: `telaParaHash(destino)` seguido de `hashParaTela` tem que voltar ao mesmo valor (round-trip), e destinos fixos têm que estar em `TELAS_FIXAS` ou nos prefixos válidos. Se alguém renomear uma rota no Shell, o teste quebra e o mapa não fica apontando pro nada.

No server, teste do schema: JSON real do repositório passa na validação (mesmo padrão que protege o `mapa-sistema.json`).

## 5. O que NÃO muda

- `Shell.tsx`, `rotas.ts`, `App.tsx`: intocados. A navegação usada já existe.
- `interno/mapa-sistema.json`: intocado no conteúdo do sistema (só o nó "mapa" ganha resumo citando a visão nova, se o texto atual não cobrir).
- Nenhum estado global novo, nenhuma API além de `GET /api/mapa/telas`.

## 6. CSS

`mapa.css` ganha um bloco `/* ===== Visao Telas ===== */`: `.mapa-visao-seletor`, `.mapa-no-tela`, `.mapa-no-tela-esqueleto` (e as variantes de esqueleto), `.mapa-no-tela-rota`, `.mapa-no-tela-abrir`, `.mapa-jornada-chip`, `.mapa-jornada-faixa`, `.mapa-passo-mini`. Tudo por token, três temas, `prefers-reduced-motion` respeitado (as poucas transições viram none).
