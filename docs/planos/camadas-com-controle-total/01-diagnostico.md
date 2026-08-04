# Camadas com controle total: o diagnóstico

Código auditado em 2026-07-31, no carrossel
`workspaces/mae-pixel/conteudo/2026-07-31-os-jovens-ja-aprenderam-a-usar-a`.

## Os três sintomas têm uma causa só

O painel de camadas trata **ordem no DOM** como se fosse **empilhamento**. No
carrossel isso só é verdade para os elementos que estão fora do fluxo, e o
painel não sabe a diferença.

### Sintoma 1: a seta move no eixo Y

`motor.ts:1700 moverCamada` troca os dois elementos de lugar no DOM
(`replaceChild` com marcador) e, quando os `z-index` diferem, troca também os
dois `z-index`.

Medido no slide 2 do carrossel:

- **Nível 0 do painel** (filhos de `.slide`): `.bimg`, `.scrim`, `.cnt`,
  `.wrap`, `.handle` são todos `position: absolute`. Trocar a ordem no DOM só
  muda quem pinta por cima. A seta funciona.
- **Nível 1 do painel** (filhos de `.wrap`): `.wrap` é
  `display: flex; flex-direction: column`, e os filhos são itens de fluxo.
  Trocar a ordem no DOM **reordena a coluna**. O texto anda na página.

É exatamente onde o Jesse viu o defeito, e ele não é aleatório: é sistemático
no nível 1.

### Sintoma 2: a caixa de blur não sai sem levar os textos

`.page .wrap` é **três coisas ao mesmo tempo**:

```css
.page .wrap{
  position:absolute; inset:140px 70px 120px; z-index:8;   /* a CAIXA   */
  display:flex; flex-direction:column; padding:72px 68px;  /* o LAYOUT  */
  border:1px solid var(--line);                            /* a PELE    */
  background:rgba(255,255,255,.035);
  backdrop-filter:blur(10px);
  box-shadow:0 24px 90px rgba(0,0,0,.20);
}
```

E os textos (`.label`, `.title`, `.body`, `.note`) são **filhos** dela.

O editor só oferece `excluirSelecionado` (`motor.ts:545`), que é `el.remove()`.
Isso leva as três coisas mais os filhos. Não existe nenhuma operação que separe
a pele da caixa, nem a caixa dos filhos. Por isso o "Ajustar com IA" também não
resolve: não é questão de instrução, é que a operação não existe.

### Sintoma 3: as setas são ultrapassadas

`PainelCamadas.tsx:65-86`. É só apresentação, mas é a ponta visível dos outros
dois: uma lista que se reordena por arrasto exige que "reordenar" tenha um
significado só, e hoje ele tem dois.

## O que não pode quebrar

- **O painel é compartilhado por três telas e dois motores.**
  `EditorCarrossel.tsx:410`, `PainelSite.tsx:557`, `PainelPropriedades.tsx:393`;
  `motor.ts` (carrossel) e `motorSite.ts` (site). Mudar o contrato sem mudar os
  dois motores quebra o site.
- **O site está CERTO do jeito que está.** `motorSite.ts:974` reordena no DOM e
  não mexe em z-index, e é isso mesmo que um documento em fluxo quer: lá
  "subir" significa "vir antes na página". O carrossel é tela fixa, e lá
  "subir" significa "pintar por cima". São dois significados legítimos, e o
  painel precisa saber qual está em uso.
- **Todo desfazer é snapshot de string** (`motor.ts:605`), e a seleção volta
  pelo `data-vk`. Qualquer operação nova entra com `snapshot()` antes.
- **O serializador preserva `data-vk` e limpa `data-ed-*`.** Marcador novo tem
  que nascer com prefixo `data-ed-` pra não vazar pro HTML salvo.
- **Dois níveis no painel** (`motor.ts:1675 listarCamadas`). Um destino de
  arrasto que criasse um terceiro nível some da lista.
