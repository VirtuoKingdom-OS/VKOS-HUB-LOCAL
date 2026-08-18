# Créditos

O VKOS 2 destila conhecimento de projetos abertos. Destilar é reescrever o conhecimento na voz
da casa, em português, pro contexto de negócio local: nunca é colar texto. Este arquivo dá o
crédito de cada fonte, com a licença e uma linha honesta do que veio de lá. Todo arquivo
destilado também credita a fonte no topo.

---

## ponytail (MIT, DietrichGebert)

Fonte: https://github.com/DietrichGebert/ponytail

O que veio de lá: a postura enxuta de código. A escada que para no primeiro degrau que resolve
(precisa existir? já existe? a stdlib faz? o nativo cobre?), causa raiz antes de sintoma,
deleção sobre adição, os níveis de intensidade e as exceções invioláveis. Base das skills
`/enxuto` e `/enxuto-revisao`.

Detalhe por arquivo:

- `skills/ponytail/SKILL.md`: a persona do preguiçoso eficiente, a escada de 7 degraus, a
  regra da causa raiz antes do sintoma, as regras contra abstração não pedida, os níveis
  leve/total/ultra, o comentário de atalho deliberado, a saída código-primeiro e as exceções
  invioláveis. Virou a skill `/enxuto`, e a escada também virou o passo de plano da skill
  `/projeto`.
- `skills/ponytail-review/SKILL.md`: o formato de uma linha por achado com tag e
  substituição, o saldo em linhas e o fecho "já está enxuto". Virou o modo diff da skill
  `/enxuto-revisao`, com as tags em português (apagar, stdlib, nativo, yagni, encolher).
- `skills/ponytail-audit/SKILL.md`: a varredura do projeto inteiro ranqueada do maior corte
  pro menor e a lista de caça (interface de implementação única, wrapper que só delega,
  dependência que a plataforma cobre, flag morta). Virou o modo projeto da `/enxuto-revisao`.

## impeccable (Apache-2.0, Paul Bakaus)

Fonte: https://github.com/paulbakaus/impeccable

O que veio de lá: a disciplina de crítica e refinamento visual. As proibições anti-slop com
alternativa, o teste "parece IA?", e os gestos de melhoria pontual (tipografia, cor, layout,
motion, mais ousado, mais quieto, clareza, polir). Base das skills `/revisar-design` e
`/refinar` e parte dos princípios visuais de cada formato. O detector determinístico de
`scripts/` NÃO foi incorporado. O NOTICE do projeto menciona guias de iOS e Android destilados
de ehmo (MIT), que não usamos.

Detalhe por arquivo:

- `SKILL.md`: as proibições absolutas com alternativa (gradient text, glassmorphism default,
  faixa lateral, eyebrow em toda seção, grade de cards idênticos) e o teste "parece IA?" com
  o reflexo de categoria em duas ordens. Espalhado nos princípios visuais de cada formato e
  no teste final da `/revisar-design`.
- `reference/critique.md`: a disciplina de crítica honesta: nota por área sem inflar, achado
  específico que nomeia o elemento, prioridade por impacto, nada de elogio vazio, e a regra
  de que nada se aplica sem aprovação. Virou a skill `/revisar-design` (o fluxo de
  sub-agentes, o detector e as personas do original não foram incorporados).
- `reference/typeset.md`, `reference/colorize.md`, `reference/layout.md`,
  `reference/animate.md`, `reference/bolder.md`, `reference/quieter.md`,
  `reference/clarify.md` e `reference/polish.md`: os oito gestos de melhoria pontual, cada
  um destilado em um parágrafo de intenção mais regras acionáveis. Viraram os modos da skill
  `/refinar` (tipografia, cor, layout, motion, ousado, quieto, clareza, polir).
- As proibições anti-slop e o teste final do `SKILL.md` também alimentaram
  `templates/carrossel/principios-visuais.md`, criado nesta mesma fase.

## taste-skill (MIT, Leonxlnx)

Fonte: https://github.com/Leonxlnx/taste-skill

O que veio de lá: a leitura de design em uma linha antes de qualquer peça visual, os dials de
personalidade (variância, motion, densidade), as estéticas nomeadas que viram direções da
cartela (Brutalista, Minimalista Editorial, Suave) e a regra anti-placeholder de entregável
sempre completo.

Detalhe por arquivo:

- `skills/output-skill/SKILL.md`: a proibição de placeholder e de saída pela metade (nada de
  "aqui você coloca X", nada de "// resto do código", nada de esqueleto no lugar da entrega,
  nada de descrever o código em vez de escrever) e o cheque final de completude contra o
  pedido. Virou a regra "Entregável completo, sempre" do CLAUDE.md e o passo de construção
  da skill `/projeto`.
- As estéticas nomeadas e a leitura de design do taste-skill também alimentaram
  `templates/design/cartela.md` e os princípios visuais dos formatos, criados nesta mesma
  fase.
- `skills/taste-skill/SKILL.md`: a leitura de design em uma linha ("Lendo isto como: ..."),
  os 3 dials de personalidade (variância, motion, densidade) e a disciplina anti-default.
  Espalhado na cartela e nas seções de leitura dos princípios visuais de cada formato.
- `skills/brutalist-skill/`, `skills/minimalist-skill/` e `skills/soft-skill/`: as três
  estéticas nomeadas, destiladas como as direções Brutalista, Minimalista Editorial e Suave
  da `templates/design/cartela.md`. O que violava os princípios da casa foi descartado na
  destilação (scanlines, glassmorphism, placeholders de imagem).

## ui-ux-pro-max (MIT, nextlevelbuilder)

Fonte: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

O que veio de lá: direções garimpadas do catálogo de estilos, paletas e pares de tipografia
pra ampliar a cartela de direções visuais. Nota de licença: o sub-skill `ui-styling` desse
projeto tem LICENSE Apache-2.0, divergente do MIT do restante. Se algo sair dele, o crédito
correto é Apache-2.0.

Detalhe por arquivo:

- `src/ui-ux-pro-max/data/styles.csv`, `colors.csv` e `typography.csv`: matéria-prima das
  quatro direções garimpadas pra cartela (Caderno, Ferro e Fôlego, Console e Vitrola), com
  paleta e par de fontes recalibrados pra passar nas proibições da casa.
- Nada saiu do sub-skill `ui-styling` (o de licença divergente), então o crédito MIT acima
  está correto.

## Temas do astryx (MIT, Meta Platforms)

Fonte: https://github.com/facebook/astryx

O que veio de lá: os 7 temas do pacote de temas, destilados como direções da cartela visual
(hoje em `templates/design/cartela.md`). Nenhum código do projeto foi incorporado.

---

> Casa em ordem: licença permissiva pede crédito, e crédito dado aqui é dado de verdade.
> Mexeu em algo destilado? Confira se o crédito do topo do arquivo e a seção daqui continuam
> contando a história certa.
