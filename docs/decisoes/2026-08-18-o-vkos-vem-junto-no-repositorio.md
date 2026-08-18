# O VKOS vem junto no repositório, como modelo limpo

## Contexto

O repositório abriu em 2026-08-06 sob AGPL-3.0, mas abriu pela metade. O Hub é
o cockpit; a coisa que ele dirige é um workspace VKOS, uma pasta de markdown com
o Cérebro, a marca, os templates e os comandos. Essa pasta nunca foi versionada:
o `.gitignore` tinha `/vkos/`, `/vkos2/` e `/workspaces/`, todas por um motivo
legítimo, que é Cérebro de cliente não ir a público.

O efeito colateral só aparece de fora. Quem clonava o projeto público subia o
servidor e chegava numa tela sem workspace nenhum. E não havia saída pela frente:
`criarWorkspaceNovo` clona a ESTRUTURA do workspace ATIVO, então sem um ativo ele
responde "Nenhum workspace aberto pra clonar a estrutura". O caminho estava
fechado nas duas pontas. Um projeto de código aberto que não roda depois do
`npm run dev` não é avaliável por ninguém, nem por um contribuidor nem por um
programa de crédito.

## Decisão

**Versionar um VKOS limpo em `vkos-modelo/`, e semear a primeira abertura a
partir dele.**

O modelo é o VKOS 2 (a versão com a camada de design, as skills de construção e
o CREDITOS.md), com o Cérebro e o design-guide em branco marcados com ✍️. São 91
arquivos e 929 KB, sem `node_modules` e sem `package-lock.json`.

O servidor ganha `semearDoModelo()` em `workspaces/integrado.ts`. Na primeira
abertura, sem workspace registrado e sem uma pasta `VKOS/` ou `vkos/` na raiz, ele
COPIA `vkos-modelo/` pra `workspaces/meu-negocio/` e abre a cópia. A ordem de
precedência fica: workspace ativo, workspace já registrado, `VKOS/` ou `vkos/` na
raiz, e só então o modelo.

Três coisas saíram do modelo antes de ele virar público:

- `marca/conversao.md` e `marca/LICENSE-revenue-centric-design.md`. A licença do
  Revenue-Centric Design se declara SOURCE-AVAILABLE, não aprovada pela OSI, e
  proíbe uso em aposta e cassino. As cinco skills que apontavam pra ele perderam
  o ponteiro e ficaram com a regra escrita nelas mesmas, que já estava lá.
- A seção correspondente do `CREDITOS.md`. O que sobrou é MIT e Apache-2.0.
- O WhatsApp real do autor, que estava no `cerebro/exemplo-cerebro.md`, trocado
  por um número de exemplo.

## Por quê

**Por que semear em vez de adotar o modelo direto.** Se o Hub abrisse
`vkos-modelo/` como workspace, o Cérebro do dono seria escrito dentro de uma pasta
versionada. O primeiro `git pull` brigaria com o negócio dele, e um `git add .`
distraído mandaria a identidade do negócio pro mundo. Semear resolve os dois de
uma vez: o modelo fica intacto e versionado, o dado do dono cai em `workspaces/`,
que o `.gitignore` já cobre desde sempre.

**Por que uma pasta nova em vez de destravar `/vkos/`.** A pasta `vkos/` da
máquina do autor é um workspace vivo, com Cérebro preenchido e peças geradas
dentro. Destravar ela no `.gitignore` seria apostar em nunca esquecer de limpar.
Uma pasta nova, que nasce limpa e que ninguém escreve dentro, não depende de
disciplina pra continuar limpa.

**Por que tirar o material de licença source-available.** Duas razões e as duas
bastam sozinhas. Uma cláusula de campo de uso é exatamente o que tirou a BSL 1.1
do caminho em 2026-08-06, e reintroduzir uma dentro de um repositório AGPL
reabriria a mesma discussão. E o material não é necessário pro Hub funcionar: as
skills que o citavam já carregavam a regra inteira no corpo delas. Ele continua
existindo nos workspaces privados do autor, onde a licença dele é respeitada sem
esforço.

**Por que o modelo nasce em branco.** Cérebro preenchido no modelo seria o
negócio de outra pessoa dentro do sistema de quem clonou, e todo comando lê o
Cérebro antes de gerar. Em branco, o `/instalar` faz a entrevista e o sistema
nasce com a cara do negócio certo. Os dois exemplos preenchidos ficam ao lado,
como referência de nível de detalhe, e nenhum comando lê eles.

## O que esta decisão não muda

`app/dados/`, `workspaces/`, `vkos/` e `vkos2/` continuam fora do versionamento.
O produto continua local-first e sem telemetria. A instalação em Windows continua
montando `VKOS/` ao lado de `app/`, e ela ganha precedência sobre o modelo, então
nenhuma instalação existente muda de comportamento.
