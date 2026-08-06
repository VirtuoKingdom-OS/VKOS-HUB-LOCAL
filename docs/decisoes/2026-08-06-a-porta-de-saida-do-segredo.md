# A porta de saída do segredo

## Contexto

A auditoria de ponta a ponta de 2026-08-06 encontrou uma coisa que o QA já
tinha anotado na Fase 5 do roadmap e que continuava aberta: **não existia
nenhum gesto capaz de tirar um token de dentro do `app/dados/conexoes.json`.**

Não era esquecimento simples. Eram duas decisões, cada uma certa sozinha, que
somadas fechavam a porta:

- `conexoes/rotas.ts`, no `PUT`, lê "campo de segredo igual ao valor mascarado"
  como "não troca o que está salvo".
- `TelaConexoes.tsx`, ao salvar, devolve a máscara justamente quando o campo
  ficou **vazio**, para que um campo não tocado não apague o token por acidente.

O efeito somado: limpar o campo era um no-op. O segredo só podia ser trocado por
outro, nunca tirado. Desabilitar a conexão também não tirava, e isso foi
confirmado no disco, em servidor de teste: depois de desabilitar, o arquivo
seguia com `{"habilitado": false, "config": {"token": "..."}}` em texto puro.

## Decisão

**Remover o segredo vira um gesto próprio, e a regra do salvar não é afrouxada.**

`DELETE /api/conexoes/:id/segredo` apaga os campos marcados como `segredo` no
catálogo, apaga também `refreshToken`, `tokenLongo` e `accessToken` (que não são
campos do catálogo porque o dono nunca os digita, e são os mais sensíveis que
existem ali) e desliga a conexão. O que não é segredo fica: a URL do projeto do
Supabase continua salva.

Na tela, "Remover token" aparece só quando há token salvo, e pergunta antes, em
dois passos, como todo gesto irreversível do Hub.

## Por quê

**Afrouxar o `PUT` teria trocado um problema por outro pior.** Se salvar com
campo vazio passasse a apagar, qualquer salvamento de um campo não tocado
perderia o token, e essa é a razão de a regra existir. Apagar credencial precisa
ser uma decisão, não um descuido, e decisão pede gesto próprio.

**Sem segredo, a conexão não fica ligada.** Interruptor aceso ligado em nada é
pior que interruptor apagado: a tela diria "conectado" e toda chamada falharia
sem motivo visível.

**A trava mede no disco, não na resposta.** A resposta mascara o segredo, então
ela responde `****` tanto para o token apagado quanto para o intacto: medir por
ela seria medir nada. `server/src/conexoes/segredo.test.ts` lê o
`conexoes.json` direto, e afirma nos dois sentidos: que a saída nova funciona e
que a regra velha do `PUT` continua de pé.

## O que ficou de fora

O app do Instagram (`clientId` e `clientSecret`) segue a mesma forma de defeito:
`instagram/conta.ts` preserva os dois de propósito no desconectar. Aquele módulo
está sendo trabalhado em paralelo por outro agente, então a saída de lá se
combina antes de encostar, e não nesta rodada.
