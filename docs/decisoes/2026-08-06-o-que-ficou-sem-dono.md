# O que ficou sem dono

## Contexto

A auditoria de 2026-08-06 varreu a web procurando arquivo que ninguém importa e
achou três componentes, somando 1075 linhas. O servidor não tinha nenhum.

Eles não custavam ao usuário, porque não entram no pacote. Custavam a nós: entram
em todo typecheck e, pior, entram nas travas de identidade e de composição, que
varrem `web/src` inteiro. Os três foram migrados na identidade v3 sem que ninguém
os fosse usar, e seriam migrados de novo na próxima.

## Decisão

Os três saíram, e cada um só depois de confirmar onde o gesto dele vive hoje.

| arquivo | linhas | onde o gesto vive agora |
|---|---|---|
| `componentes/editor/EditorCarrossel.tsx` | 695 | O Studio (`studio/TelaStudio.tsx`), que usa o mesmo `usarMotorEdicao`. Os quatro painéis que ele compunha (`PainelCamadas`, `AcoesDaCaixa`, `GaleriaFontes`, `ControlesImagem`) estão vivos e são usados por `studio/PainelPropriedades.tsx` e `site/PainelSite.tsx`. |
| `componentes/pecas/PainelPecas.tsx` | 264 | `pecas/CartaoPeca.tsx` e `pecas/Lightbox.tsx`, usados por `cockpit/GaleriaContainer.tsx` e `telas/TelaFluxo.tsx`. |
| `componentes/onboarding/NavegadorPastas.tsx` | 116 | O seletor de pasta do sistema, por `POST /api/ambiente/escolher-pasta`. O Onboarding nem escolhe pasta mais: ele diz por escrito que o Hub trabalha com o VKOS que veio junto. |

Junto com eles saíram 99 linhas de CSS que só os vestiam: a seção do overlay de
carrossel e o trilho de páginas, em `editor/editor.css`, e a seção do navegador
de pastas, em `layout/workspaces.css`.

## Por que o CSS foi cortado com cuidado, e não de uma vez

Três regras da folha do editor tinham seletor morto e seletor vivo na mesma
linha: `.editor-canvas, .ed-canvas`, `.editor-palco, .ed-palco` e
`.editor-frame, .ed-frame`. Cortar a regra inteira teria apagado o palco e a
moldura do Studio. Saiu só o seletor morto de cada uma.

**E o Studio é justamente o que a conferência visual de rotina não alcança**:
`ferramentas/olhar-telas.mjs` pula, por escrito, tela que só existe dentro de
fluxo. Então a prova foi montada antes do corte, e não depois: um workspace
temporário com uma peça real, o Studio aberto por playwright e as medidas do
palco, da moldura e do painel gravadas. Depois do corte, as medidas saíram
idênticas (`palco 5184x836`, `moldura 5184x836`, `painel 320x844`) e o console
ficou em zero.

Uma descoberta da medição, que a leitura sozinha não daria: **o Studio não usa
`.editor-canvas` nem `.ed-canvas`**. Se eu tivesse cortado pela leitura, teria
concluído a coisa errada sobre qual dos dois seletores estava vivo.

## O que NÃO foi feito

Nenhuma varredura de CSS morto além do que pertencia aos três arquivos. Ela é
rodada própria, e precisa da mesma prova montada antes: a folha do editor tem
887 linhas e veste duas telas que a conferência de rotina não fotografa.
