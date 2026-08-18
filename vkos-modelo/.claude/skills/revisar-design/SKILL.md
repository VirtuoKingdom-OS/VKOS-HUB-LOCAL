---
name: revisar-design
description: >
  Audita uma peça visual pronta (site, carrossel, stories, interface de projeto) contra os
  princípios do formato, a cartela e o design-guide do negócio. Dá nota honesta por área
  (cor, tipografia, layout, motion, proibições), uma frase por achado, propõe as correções
  em ordem de impacto e aplica só as aprovadas. Use quando o comprador disser
  /revisar-design, "revisa o design", "essa peça ficou boa?", "dá uma nota pro meu site",
  "isso tá com cara de IA?", ou depois de gerar uma peça que merece um pente fino.
---

# /revisar-design: o pente fino da peça visual

Esta skill não cria nada. Ela julga o que já existe, com franqueza de diretor de arte. O valor
dela é achar o que denuncia IA ou quebra a marca. Elogio de fachada não ajuda ninguém: se a
peça está boa, diga curto e siga; se não está, aponte onde e por quê.

## Passo 1: identificar a peça

- Se o comprador deu o caminho, use ele.
- Se não deu, procure a peça mais recente em `conteudo/` (a pasta `AAAA-MM-DD-tema/` mais nova
  com arquivo visual dentro: `carrossel.html`, `index.html`, stories).
- Se houver dúvida real entre duas peças, faça **UMA** pergunta ("é o site de ontem ou o
  carrossel de hoje?") e siga.

Identifique também o formato: carrossel, stories, site ou interface de projeto. É ele que
define a régua.

## Passo 2: ler as réguas (antes de opinar)

Leia, nesta ordem:

1. `templates/<formato>/principios-visuais.md` do formato da peça (pra interface de projeto,
   use o de site, que é o mais próximo).
2. `templates/design/cartela.md`: as direções visuais e os 3 dials.
3. `templates/design/estilos/indice.md`: a biblioteca de estilos. Se a peça declarou um estilo
   quando foi criada, leia também o arquivo daquele estilo inteiro (`estilos/<nome>.md`).
4. `identidade/design-guide.md`: o visual próprio do negócio, se definido.
5. `cerebro/cerebro.md`: o público, a voz, as provas. A peça tem que parecer DESSE negócio.

Precedência na avaliação: o design-guide manda mais que a cartela; num carrossel, o modelo
travado do catálogo (`templates/carrossel/estilos.md`) manda mais que tudo. Se a peça declarou
uma leitura de design, uma direção ou um estilo quando foi criada, avalie contra ELES:
coerência com a direção e o estilo escolhidos vale mais que a sua preferência.

## Passo 3: avaliar por área, com nota honesta

Percorra a peça inteira (todos os slides, todas as telas, todas as seções) e avalie cinco
áreas. Cada achado é **UMA frase**, específica: nomeia o elemento, o slide ou a seção, e diz
por que aquilo machuca.

| Área | O que olhar |
|---|---|
| Cor | Paleta da marca aplicada, contraste (corpo 4.5:1, texto grande 3:1), cinza sobre cor, acento com papel claro |
| Tipografia | Hierarquia legível de relance, par de fontes com contraste real, corpo legível, texto vazando |
| Layout | Ritmo de espaço, agrupamento, um pensamento por quadro, hierarquia em 2 segundos |
| Motion | Propósito, easing, reveal que não esconde conteúdo, reduced-motion (quando a peça tem motion) |
| Proibições | A lista anti-slop do princípios do formato, item por item |

Nota de 0 a 10 por área, honesta. Peça real costuma ficar entre 5 e 8. Um 10 é raríssimo e
precisa ser defendido. Nota alta sem mérito é a forma mais cara de mentir pro dono.

Confira o estilo declarado: se a peça nasceu com um estilo da biblioteca, o CSS tem que usar os
tokens daquele estilo (as cores, a escala tipográfica, o spacing e o motion do arquivo do
estilo). Estilo declarado no papel mas CSS genérico por baixo é a falha mais comum: conta como
proibição grave, não como detalhe.

Feche o passo com o **teste "parece IA?"** nas duas ordens do princípios do formato:

- **Primeira ordem:** dá pra adivinhar o tema e a paleta só pelo segmento do negócio? Falhou.
- **Segunda ordem:** dá pra adivinhar a estética a partir de "categoria mais o que a IA
  evitaria"? Falhou também. O que salva é o específico deste negócio: a cidade, a história,
  o jeito de falar do dono.

## Passo 4: propor as correções, em ordem de impacto

Apresente o resultado assim:

1. **O quadro de notas** (as cinco áreas + o veredito do teste "parece IA?").
2. **Os achados**, uma frase cada, do mais grave pro menor.
3. **As correções propostas**, numeradas, em ordem de impacto: o que mudar, onde, e o que a
   peça ganha. Cada uma em uma linha.

Aí pergunte, simples: *"Quais aplico? Pode ser 'todas', 'as 3 primeiras' ou os números."*
Não aplique nada antes da resposta.

## Passo 5: aplicar só as aprovadas

- Faça a menor edição que realiza cada correção aprovada. Não redesenhe o que não foi citado.
- Se a peça é renderizada (carrossel, stories), renderize de novo depois das edições.
- Confira o checklist de saída do princípios do formato antes de devolver.
- Feche dizendo o que mudou, onde a peça está salva, e a nota que as áreas corrigidas
  passariam a ter.

## Princípios

1. **Nunca elogiar por elogiar.** O trabalho é achar o que denuncia IA ou quebra a marca.
2. **Específico ou nada.** "O título do slide 3", não "alguns elementos". Achado vago é
   tempo perdido.
3. **Impacto manda na ordem.** Se tudo é importante, nada é. As 3 primeiras correções valem
   mais que as 10 seguintes.
4. **A peça é do dono.** Propor é seu papel; decidir é dele. Nada se aplica sem aprovação.

---

Destilada de `reference/critique.md` do impeccable (Apache-2.0, Paul Bakaus), reescrita em
português pro fluxo de peças do VKOS. Crédito completo em `CREDITOS.md`.
