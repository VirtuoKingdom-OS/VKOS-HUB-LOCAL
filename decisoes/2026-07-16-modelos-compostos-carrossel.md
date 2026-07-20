# Capa e páginas com modelos compostos

## Contexto

Cada template de carrossel contém capa, desenvolvimento e CTA no mesmo HTML. O wizard só permitia escolher o pacote inteiro.

## Decisão

O wizard passa `estiloCapa` e `estiloPaginas`. Quando são diferentes, a skill copia o modelo das páginas como base e transplanta a primeira `.slide` do modelo da capa, junto do CSS necessário escopado por uma classe exclusiva.

Os templates continuam inteiros. O cockpit mantém o seletor único e a forma simples `usando o modelo X`.

Endurecimento de 2026-07-17: a escolha deixou de ser somente uma frase no comando. O prompt informa os arquivos exatos, exige copiar o template antes de editar, preserva anatomia, classes, geometria, hierarquia, ritmo e acabamento, e pede comparação estrutural final. A skill repete esse contrato. No fluxo guiado, Fontes de dados e upload passam pela mesma lista de anexos, e as instruções livres ficam na última etapa para chegar ao prompt como palavra final do usuário.

## Por quê

A composição pela skill entrega a flexibilidade agora sem fragmentar quatorze templates nem criar um sistema paralelo de montagem. O escopo de CSS é obrigatório para impedir vazamento visual entre as duas origens.
