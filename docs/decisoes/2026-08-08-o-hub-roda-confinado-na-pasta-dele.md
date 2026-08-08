# O Hub roda confinado na pasta dele

## Contexto

O Hub mudou de lugar em 2026-08-08, de `VKOS/VKOS-HUB-LOCAL` para
`ojgvkos/projetos/VKOS-HUB-LOCAL`. Ele subiu normal e a tela abriu, mas os
quatro projetos apontavam para o endereço antigo. Nenhum deles existia mais.

A causa: `app/dados/workspaces.json` e `app/dados/config.json` guardavam caminho
ABSOLUTO. Cada gravação carimbava no arquivo o lugar exato da máquina naquele
dia, então mover, renomear ou copiar a pasta do Hub quebrava o registro inteiro
de uma vez, e sem aviso: a tela abre, o motor responde, e os projetos somem.

Isso não é problema só do desenvolvimento. O produto é distribuído em pasta, e o
`LEIA-ME.md` já pedia ao cliente que não mudasse a pasta de lugar. Pedir isso é
mais frágil que consertar.

## Decisão

Pasta que está DENTRO da raiz do Hub vai para o disco relativa a ela, e volta
absoluta na leitura. Pasta de fora continua absoluta, porque relativa ali não
diria nada.

A conversão mora em `app/server/src/util/caminhoPortavel.ts`, módulo folha, e
entra em exatamente dois lugares, que são as duas portas onde caminho encosta em
disco:

- `workspaces/estado.ts`: `lerRegistroDeArquivo` absolutiza na entrada,
  `salvarRegistro` relativiza na saída.
- `vkos/estado.ts`: o mesmo par em `lerPastaVkosDeArquivo` e `definirPastaVkos`.

Dali para dentro o servidor continua vendo caminho absoluto, como sempre viu.
Nenhum outro módulo mudou.

O `doDisco` devolve a mesma forma canônica do `normalizarPasta` do registro:
barra normal, sem barra no fim. As duas pontas precisam bater, senão a
comparação de pastas passa a errar no Windows, onde o `resolve()` devolve barra
invertida. Isso quebrou quatro testes na primeira tentativa, e é o que a trava
de forma canônica em `util/caminhoPortavel.test.ts` protege.

Os dois arquivos de dados foram reescritos com caminho relativo, e as cópias
datadas ficaram ao lado. O `VKOS/` empacotado não veio na mudança, e o "Meu
negócio" passou a apontar para o `vkos/` da raiz, que o
`localizarVkosIntegrado` já aceitava como o VKOS integrado do ambiente de
desenvolvimento.

Os dois `.cmd` não mudaram: eles conferem `%RAIZ%VKOS`, e o Windows não
diferencia maiúscula em caminho, então `vkos/` já satisfaz as três conferências.

## Por quê

Porque o registro de workspaces é a única memória de quais projetos existem, e
ele estava amarrado a um endereço que qualquer gesto normal do dono desfaz:
mover a pasta, renomear, restaurar um backup em outro drive, copiar para outra
máquina. O dado que o arquivo precisa guardar é "qual pasta dentro do Hub", e
não "onde o Hub estava no dia em que isto foi salvo".

Prova: com o registro relativo, uma cópia da raiz em `C:\...\Temp` resolveu os
quatro projetos para dentro dela, em outro drive, sem editar arquivo nenhum.
