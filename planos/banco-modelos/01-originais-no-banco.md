# Originais no Banco visual: mostrar e atualizar os 14 modelos atuais

Adendo ao `00-plano.md`. Executar junto com ele, como emenda das fases 1, 2 e 4.
Onde este arquivo contradiz o 00, este arquivo manda.

## O pedido

O Banco visual deve mostrar também os 14 modelos atuais (vkos01 a vkos09 mais os 5
clássicos), e o Jesse deve poder atualizá-los. A atualização precisa chegar a TODOS os
clientes, os existentes e os novos, senão vira só um editor da semente (a Opção A que já
foi descartada).

## O mecanismo: sobrescrita no banco com atualização no uso

1. A semente `vkos2/templates/carrossel/` continua intocada. Ela é o estado de fábrica.
2. O banco central pode guardar uma SOBRESCRITA de um modelo original: uma entrada em
   `dados/modelos-carrossel/<id>/` cujo id é EXATAMENTE um id da semente (ex: `vkos01`),
   sem prefixo `b-`. Copy-on-write: a sobrescrita só nasce quando o Jesse edita um
   original pela primeira vez.
3. Onde existe sobrescrita, o banco é a fonte da verdade daquele id: a listagem, o preview
   e a geração usam a versão do banco, não a local nem a da semente.
4. A cópia no uso do 00 vira ATUALIZAÇÃO no uso: no `POST /api/sessoes`, para cada id em
   `modelosUsados` que existe no banco (novo `b-*` ou sobrescrita), comparar o conteúdo do
   arquivo do banco com o `templates/carrossel/modelo-<id>.html` do workspace. Arquivo
   ausente ou diferente: gravar a versão do banco por cima. Igual: não tocar. Assim o
   cliente antigo recebe a atualização no primeiro uso, sem varredura em massa.

## Emenda à regra de id do 00

A regra "todo id do banco tem prefixo `b-`" muda para:

- Modelo NOVO: id com prefixo `b-`, como no 00.
- SOBRESCRITA: id igual a um id do catálogo da semente. Validação no `salvarModeloBanco`:
  o id sem prefixo `b-` só é aceito se existir na semente. O catálogo da semente é lido com
  `lerModelosCarrossel(resolverSemente("vkos2"))` (a função já aceita qualquer pasta no
  formato VKOS; `resolverSemente` vem de `plataforma/provisionamento.ts`).
- Qualquer outro id: 400. A garantia de não-colisão do 00 continua de pé por construção.

## Resolução do preview (emenda à fase 2)

`GET /modelos-html/:id/preview` passa a resolver nesta ordem:

1. Sobrescrita ou modelo novo no banco.
2. Arquivo local do workspace ativo (comportamento de hoje).
3. Arquivo da semente (novo fallback: deixa o painel de gestão funcionar mesmo sem
   workspace ativo e mostra o original quando não há sobrescrita).
4. 404.

As injeções (base, script isolador, svg de exemplo) são as mesmas nos três casos.

## Listagem unificada (emenda à fase 2)

`GET /api/vkos/modelos-carrossel` monta a união assim, por id:

1. Sobrescrita no banco: entra a versão do banco (metadados do `modelo.json`; o
   `pedeImagem` da sobrescrita vence o conjunto `PEDEM_IMAGem` hardcoded).
2. Sem sobrescrita: o local do workspace, como hoje.
3. Modelos novos `b-*` do banco, como no 00.

A rota de gestão `GET /admin/banco-modelos` devolve os DOIS grupos com marcação:

- `originais`: os 14 da semente, cada um com `temSobrescrita: boolean` e
  `atualizado: boolean` (a sobrescrita difere do arquivo da semente; comparar conteúdo).
- `proprios`: os `b-*`.

## Painel Banco visual (emenda à fase 4)

Duas seções na grade:

- "Originais do VKOS": os 14, sempre visíveis, thumb pelo preview. Sem sobrescrita, o
  cartão é somente leitura com a ação "Editar" (que cria a sobrescrita ao salvar). Com
  sobrescrita que difere da semente, badge "Atualizado" e ação extra "Restaurar original".
- "Criados por você": os `b-*`, como no 00.

Ações de edição de um original, as mesmas dos `b-*`:

- Editar metadados (nome, descrição, tipo, pedeImagem). Salvar cria ou atualiza a
  sobrescrita.
- Substituir HTML (colar ou upload).
- "Abrir no Studio": nova ação, disponível pra QUALQUER modelo (original ou `b-*`).
  O servidor materializa uma peça temporária no workspace ativo do Estúdio
  (`conteudo/<AAAA-MM-DD>-edicao-modelo-<id>/carrossel.html` com o HTML vigente do
  modelo), o painel abre `/w/<id>/studio/<pasta>` em aba nova, o Jesse edita no editor que
  já existe e salva. De volta ao painel, "Salvar no banco" lê a peça
  (`origemHtml: { modo: "peca", ... }` do 00) e grava como sobrescrita ou atualização.
  Endpoint novo: `POST /admin/banco-modelos/:id/abrir-studio` devolve
  `{ workspaceId, pasta }`. Exige workspace ativo no Estúdio, como o fluxo Copiar modelo.

## Restaurar original

"Restaurar original" NÃO apaga a entrada de sobrescrita. Ele grava o conteúdo da semente
por cima da sobrescrita (HTML e metadados voltam ao de fábrica). Motivo: se a entrada
fosse apagada, a atualização no uso pararia de comparar e os clientes que já receberam a
versão editada ficariam presos nela pra sempre. Com a entrada mantida e igual à semente, o
próximo uso em cada cliente regrava o arquivo de fábrica e o parque converge. O badge
"Atualizado" some sozinho (a comparação com a semente passa a dar igual).

`DELETE /admin/banco-modelos/:id` continua existindo só para os `b-*`. Para id de
original, responder 400 apontando o "Restaurar original".

## Risco novo e mitigação

Atualização no uso sobrescreve um arquivo dentro do workspace do cliente. É a primeira vez
que o servidor regrava um arquivo de template de cliente. Mitigações:

- Só o arquivo exato `templates/carrossel/modelo-<id>.html` do id usado na geração. Nunca
  varrer a pasta, nunca tocar outro arquivo.
- Templates são arquivos de sistema, não de conteúdo do cliente. Peças já geradas não são
  afetadas (a peça é uma cópia independente em `conteudo/`).
- A função que decide a ação (copiar, sobrescrever, pular) é pura e testada isoladamente:
  recebe id, conteúdo local (ou ausência) e conteúdo do banco, devolve a decisão.
- Registrar a decisão de produto no arquivo de `decisoes/` da rodada: editar um original
  atualiza o parque inteiro no uso; restaurar converge de volta.

## Testes (soma aos do 00)

- `bancoModelos.test.ts`: id de sobrescrita válido só quando existe na semente; id sem
  `b-` e fora da semente rejeitado; restaurar regrava conteúdo da semente mantendo a
  entrada; `atualizado` compara certo.
- Função pura da atualização no uso: ausente copia, diferente sobrescreve, igual pula,
  id fora do banco não faz nada.
- Resolução do preview na ordem banco, workspace, semente.
- Listagem unificada: sobrescrita vence o local; `pedeImagem` da sobrescrita vence o
  hardcoded.
- Headless na fase 6: editar um original no painel (trocar uma cor via substituir HTML),
  ver o badge "Atualizado", entrar num cliente, gerar com aquele modelo e conferir que o
  arquivo do workspace foi regravado com a versão nova; restaurar e conferir a convergência
  no uso seguinte.

## Encaixe nas fases do 00

- Fase 1: regra de id emendada, comparação com a semente, `atualizado` na listagem admin.
- Fase 2: resolução de preview em três níveis, listagem unificada com sobrescrita,
  atualização no uso no lugar da cópia simples.
- Fase 4: as duas seções do painel, badge, Restaurar original, Abrir no Studio.
- Fases 3 e 5: sem mudança.
- Fase 6: os testes e o headless acima somam à verificação, e a decisão registrada cobre
  os dois planos.
