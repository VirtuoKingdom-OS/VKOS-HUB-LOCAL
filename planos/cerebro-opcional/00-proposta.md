# Cérebro opcional na criação visual e no Site Guiado

Proposta para aprovação. Nada deste plano foi aplicado.

## Contexto

Hoje o Cérebro é obrigatório pra gerar conteúdo visual (carrossel, post, story) e site. A obrigação está em quatro camadas que se reforçam:

1. **Trava dura no servidor.** `POST /api/sessoes` recusa com 409 quando a skill é `carrossel` ou `site` e o `cerebro.md` não está preenchido (`app/server/src/sessoes/rotas.ts`, guarda `skillExigeCerebro`). É a garantia real: sem ela, o provedor encerraria o turno explicando que falta contexto e o Hub ficaria esperando um arquivo que nunca nasce.
2. **Prompts do wizard.** `montarPromptSite` manda "Leia cerebro/cerebro.md: é a fonte da verdade" no Bloco 1 (nos dois modos, aprimorado e econômico). O CTA sem link cai no "contato do Cérebro". O visual padrão diz "se o Cérebro tiver paleta, ela manda". `montarPromptCriacao` cita a identidade do Cérebro nas imagens e no modo montagem.
3. **Skills do workspace.** `.claude/skills/carrossel/SKILL.md` (linha 16) e `.claude/skills/site/SKILL.md` (linha 20) mandam ler o Cérebro e, se estiver em branco, chamar `/instalar` (a entrevista). As skills vivem DENTRO de cada workspace: mudar o seed `vkos2` só alcança workspaces novos.
4. **Portas de entrada.** No Cockpit, cliente sem Cérebro vê só o convite pra entrevista ("Este cliente ainda não tem nada"), sem caminho de criação. No Dashboard o wizard abre, mas o 409 do servidor vira o erro "Monte o Cérebro antes de gerar".

O pedido: tornar o Cérebro opcional nesses dois fluxos, nas duas portas, sem quebrar a arquitetura.

## Princípio do desenho

O Cérebro continua sendo o caminho recomendado e o padrão quando existe. O "sem Cérebro" é uma escolha explícita do usuário, carregada de ponta a ponta como contrato: o wizard declara, o servidor autoriza, o prompt neutraliza a leitura. Nenhuma camada decide sozinha por inferência.

Por que um flag explícito e não "servidor deixa passar quando vazio": abas antigas e bundles em cache continuariam gerando sem aviso e cairiam exatamente no buraco que a trava de 409 fecha hoje (sessão concluída sem peça). Com o flag, requisição antiga sem o campo mantém o comportamento atual. Compatível por construção.

## Fase 1, contrato e servidor

- `POST /api/sessoes` ganha o campo opcional `semCerebro: boolean`.
- A guarda muda de `skillExigeCerebro(skill) && !preenchido` para `skillExigeCerebro(skill) && !preenchido && !corpo.semCerebro`. Cérebro preenchido ignora o flag (não tem efeito).
- O flag fica registrado na sessão (campo novo em `Sessao`), pra transcrição e depuração contarem a história certa.
- Ajuste de peça (escopoPeca) já passa pela guarda hoje sem exigir Cérebro (a skill é resolvida depois da guarda). Confirmar com teste que peça criada sem Cérebro continua ajustável. Polimento no mesmo passo: `montarPromptAjustePeca` deixa de emitir o bloco `<cerebro>` quando o conteúdo está vazio.
- Testes: 409 preservado sem flag; 200 com flag e Cérebro vazio; flag irrelevante com Cérebro preenchido; ajuste de peça sem Cérebro.

## Fase 2, prompts

Bloco novo e único, `blocoSemCerebro()`, compartilhado pelos dois construtores:

```
MODO SEM CÉREBRO (escolha explícita do usuário nesta geração):
- NÃO leia cerebro/cerebro.md e NÃO chame /instalar. Não faça nenhuma pergunta.
- A identidade desta geração vem SOMENTE do que o usuário forneceu neste prompt
  (tema, descrição do negócio, instruções finais). O que não foi dito, resolva
  com bom senso genérico do nicho, sem inventar nome, endereço, preço ou prova social.
- Onde a skill mandar usar o Cérebro, use a identidade desta geração no lugar.
```

- `montarPromptSite`: no modo sem Cérebro, o Bloco 1 troca a linha "Leia cerebro/cerebro.md" pelo bloco acima (nos dois modos, aprimorado e econômico). `ctaLinhas` sem link deixa de citar o Cérebro e aponta pra `#contato`. A linha de visual padrão vira "use a paleta do estilo escolhido".
- `montarPromptCriacao`: mesmo bloco anexado; no modo montagem econômica, "conteúdo vem das instruções finais do usuário e do Cérebro" vira só "das instruções finais do usuário".
- Fixtures novas ao lado das existentes (`prompt-sem-cerebro-site.txt`, `prompt-sem-cerebro-carrossel.txt`), com teste garantindo que o modo ligado atual não mudou em nada (diff zero nas fixtures antigas).

## Fase 3, wizard (porta única das duas entradas)

O `AssistenteCriacao` serve Cockpit e Dashboard, então a escolha vive num lugar só.

- Com Cérebro preenchido: nada muda na interface. Cérebro é usado como hoje, sem pergunta nova.
- Com Cérebro vazio: a primeira etapa ganha o seletor "Identidade desta geração" com duas opções. "Montar o Cérebro primeiro (recomendado)" leva pra entrevista. "Seguir sem Cérebro" libera o wizard e mostra um campo opcional "Descreva o negócio em poucas linhas" (nome, o que vende, pra quem, cidade), que entra no prompt como identidade da geração.
- O wizard envia `semCerebro: true` só nesse caminho. O erro 409 e o botão "Montar o Cérebro" continuam existindo pra aba antiga.
- Estado da escolha entra no rascunho persistido do wizard como os demais campos.

## Fase 4, portas de entrada

- **Cockpit vazio**: o convite à entrevista continua sendo o principal. Entra uma ação secundária discreta, "Criar sem o Cérebro", que abre o wizard de criação já no caminho sem Cérebro. O texto atual ("a identidade que todas as gerações vão usar") permanece: segue verdadeiro como recomendação.
- **Dashboard**: já abre o wizard hoje; a Fase 3 resolve sozinha. Só conferir que o cartão de criação não esconde nada quando o Cérebro está vazio.
- **Cerimônia do Cérebro**: intocada. Continua sendo o caminho feliz.

## Fase 5, skills do seed

Nas skills `carrossel` e `site` do seed `vkos2`, a linha "Se estiver em branco, chame o /instalar" ganha a ressalva: "Se o prompt declarar MODO SEM CÉREBRO, pule esta leitura e use a identidade fornecida no prompt".

Workspaces existentes ficam com a skill antiga, e está tudo bem: o bloco do prompt já instrui o agente a não ler o Cérebro e prompt explícito prevalece sobre o passo genérico da skill. A mudança no seed é reforço pra workspaces novos, não dependência. Nenhuma migração de skill em cliente existente.

## O que NÃO muda

- A trava de geração única em andamento (`geracaoVisualEmAndamento`).
- O laço de conformidade do site e a auditoria visual (não dependem do Cérebro).
- A cerimônia, a skill `/instalar` e o caminho recomendado.
- Nenhuma rota nova, nenhuma migração de banco, nenhum campo novo em disco além do flag na sessão.
- Comportamento de clientes com Cérebro preenchido: idêntico byte a byte nos prompts (garantido por fixture).

## Riscos e mitigação

- **Qualidade da peça sem identidade.** Peça genérica é o custo aceito da escolha. Mitigação: campo opcional de descrição no wizard e instrução explícita de não inventar dados concretos (nome, preço, endereço, prova social).
- **Skill antiga desobedecer o prompt.** Improvável (instrução explícita e local vence passo genérico), mas coberto: se o agente ainda assim chamar `/instalar`, a sessão headless não trava o Hub (a entrevista não roda em headless, o turno encerra). Teste manual desse cenário num workspace com skill antiga entra na verificação.
- **Aba antiga.** Sem flag, comportamento atual preservado (409 com mensagem de montar o Cérebro).

## Verificação

- Testes de servidor (guarda, flag, ajuste de peça) e de prompt (fixtures novas + diff zero nas antigas).
- Typecheck e suíte completa nos três workspaces.
- Manual, via navegador headless: Dashboard e Cockpit com Cérebro vazio geram carrossel e site sem 409; com Cérebro preenchido, nada mudou; peça criada sem Cérebro abre no Studio e aceita ajuste.
- Documentação: decisão em `decisoes/`, `app/CONTRATO.md` (campo novo do POST), `interno/mapa-telas.json` (estado novo do wizard e do Cockpit vazio), CHANGELOG.

## Ordem de execução

Fases 1 e 2 juntas (servidor e prompts, tudo testável sem interface), depois 3, depois 4, depois 5, verificação no fim. Estimativa: uma rodada de trabalho, sem migração e sem quebra.
