# A demolição do legado.css

## Contexto

A Fase 2 do redesign v2 migrou as 21 folhas de tela para a fundação nova, uma
onda por vez. O `app/web/src/estilos/legado.css` existia para o app continuar de
pé enquanto isso acontecia: ele recebeu, sem edição, todo o CSS de tela e de
casca que morava dentro do `global.css` e do `visual-hub.css` antes do redesign.
1640 linhas, na camada `tela`, importado depois de todas as folhas da fundação.

Ele cobrava um preço que ninguém tinha escolhido pagar. Dentro dele havia um
bloco `input, textarea, select` escrito por SELETOR DE ELEMENTO. Camada vence
especificidade, não o contrário: aquele bloco derrubava `.campo`, `.campo-p`,
`.caixa` e `textarea.campo`, que moram na camada `base`. Medido no navegador:
todo campo do app saía com 40px de altura e 10px de raio, a caixa de seleção de
16px virava um retângulo de 40px de alto e a área de texto de 80px encolhia para
40px. Seis folhas migradas carregavam um bloco de remendo nomeado para devolver
a escala dentro do próprio escopo, e três regras do `canvas.css` carregavam um
nível a mais de especificidade pelo mesmo motivo.

Sobravam também dois componentes sem dono, que nenhuma onda podia levar porque
nenhum deles pertence a uma tela só: o cartão de uma geração com o visor que
amplia ela (`componentes/pecas/`), usado pela tela de um fluxo, pela galeria
unificada e pela galeria de um contêiner do Cockpit; e o wordmark com as duas
telas de abertura (`componentes/comum/Telas.tsx`), usados pela barra lateral,
pelo onboarding e pelo boot do app.

## Decisão

O `legado.css` foi demolido classe por classe e o arquivo não existe mais. Com
ele saíram o import de `main.tsx`, a entrada de `PENDENTES` em `folhas.ts`, as
duas menções em `camadas.test.ts` e os 22 apelidos legados de token do
`global.css`.

Cada bloco foi conferido por grep no TSX antes de sair, e o critério foi um só:

- **Órfão, apaga.** Nenhum componente casava com ele. Foram 76 classes, entre
  elas `.cartao-fonte*`, `.previa-*`, `.fontes-hub-*`, `.cartao-prompt*`,
  `.crm-hero`, `.tela-fluxo`, `.fluxo-vazio`, `.chip-filtro` e as vinte e duas
  de dashboard que já estavam comentadas.
- **Duplicata de folha migrada, apaga.** Todo o trecho que vinha do
  `visual-hub.css` era override de classe que a folha da tela já escreve
  inteira, em token, na fundação nova.
- **Ainda usado, migra.** Nunca fica. O que sobrou virou duas folhas novas,
  escritas na fundação v2: `componentes/pecas/pecas.css` e
  `componentes/comum/comum.css`.

Os sete blocos de remendo saíram junto com a causa, e a conferência visual nos
dois temas confirmou o efeito: campo e select com 32px de altura e 6px de raio,
caixa de seleção quadrada de 16px, interruptor de 36 por 20, botão de 28px,
select com a seta desenhada em CSS de volta.

A lista `PENDENTES` continua existindo, vazia. Ela é a única forma honesta de
abrir uma exceção temporária às travas de conteúdo: quem precisar escreve o nome
da folha ali, com data e motivo, e o próximo que passar vê a dívida em vez de
descobrir por acidente.

## Por quê

**Porque um arquivo de compatibilidade que sobrevive vira o sistema.** Enquanto
ele existisse, toda tela nova nasceria com um bloco de remendo, e o remendo é
mais fácil de copiar do que de entender. Seis folhas já carregavam um; a sétima
teria copiado da sexta sem ler o comentário. O custo de manter o legado não era
o arquivo: era o hábito que ele ensinava.

**Porque migrar é diferente de mover.** Os dois componentes sem dono não foram
transplantados: foram redesenhados dentro do contrato. O cartão da peça passou a
compor `.cartao`, o título caiu de 15px/700 para 14px/600 (peso 700 é ênfase de
dado, e o tema de um carrossel é um nome), a miniatura parou de ficar menta ao
passar o mouse (menta só diz o que está vivo), o botão "Abrir" deixou de ser
`.botao-principal` porque são até trinta cartões iguais na mesma tela, e o botão
de baixar um slide deixou de existir só no hover, que era a última ação
hover-only do app.

**Porque o apelido de token é a mesma dívida com outro nome.** `--borda` e
`--linha` apontavam para o mesmo valor, e enquanto os dois existissem o código
novo pegaria um dos dois pelo autocompletar. Cada um dos 22 foi conferido por
`var(--nome)` no CSS e no TypeScript antes de sair: zero uso, zero risco. A
trava de "nenhuma folha usa token que ninguém declara", em `camadas.test.ts`,
reprova quem tentar ressuscitar um.
