# Site Guiado v2: arquitetura

Auditado no código em 2026-07-16. Raiz do repo: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPPv2`. Caminhos relativos à raiz. Linhas desta data: divergência pequena adapta, grande avisa o Jesse.

## Estado atual que importa

### O wizard (EtapasSite.tsx)

- `app/web/src/componentes/criacao/EtapasSite.tsx`. Interface `DadosEtapasSite` (linhas 17 a 40): `tema`, `detalhes`, `formato` ("unica" | "completo" | "bio"), `objetivo` ("whatsapp" | "agendamento" | "orcamento" | "contato"), `linkObjetivo`, `modelo`, `secoes` (string[] | null, null = Auto), `modoImagem` ("sem" | "com" | "ia"), `anexos: AnexoEnviado[]`, `visualModo`, cores e fontes. Defaults em `criarDadosEtapasSite` (44 a 62).
- 4 etapas (`rotulosEtapa`, 279 a 284): "O site", "A estrutura", "Com ou sem imagens?", "Visual e gerar". Validação em `etapaValida` (182): etapa 0 exige tema, etapa 3 exige modelo.
- Etapa 0 (306 a 370): textarea `tema`, textarea `detalhes` (322 a 330, rótulo "Detalhes (opcional)", placeholder "O que não pode faltar, tom, público, o que evitar..."), cards de formato, cards de modelo de IA.
- Etapa 1 "A estrutura" (373 a 430): chips de `OBJETIVOS` (102 a 123) + input `linkObjetivo` (375 a 399); bloco Seções (402 a 428, oculto no formato "bio") com chip "Auto (recomendado)" + chips de `SECOES` (126 a 135), toggle em `alternarSecao` (267 a 274). Este bloco de chips de seção é o que morre.
- Etapa 2 (433 a 549): 3 cards: "Sem imagens" (`modoImagem: "sem"`), "Enviar minhas imagens" (`"com"`, 447 a 457), "Gerar com IA" (`"ia"`, Codex only, 458 a 475). Com `"com"`, bloco "Suas imagens" (478 a 547): dropzone que chama `enviarArquivos` (229 a 249), que lê base64 e chama `enviarAnexo` da API.
- Etapa 3 (552 a 640): visual (negócio ou personalizado com cores e fontes). Botão "Gerar site" (657 a 664).

### O prompt (promptSite.ts)

- `app/web/src/componentes/criacao/promptSite.ts`, `montarPromptSite` (124 a 190).
- Seções: `secoesLinhas` (37 a 45). Auto: "escolha as seções que fizerem sentido pro negócio, seguindo o método da skill /site". Lista fixa: "use exatamente estas, nesta ordem" + rótulos de `ROTULO_SECAO` (10 a 18).
- Imagens: `imagensLinhas` (88 a 115). Com anexos: "O usuário enviou imagens em: {caminhos}" + "Copie os arquivos que você usar pra conteudo/{pasta}/img/ e referencie por caminho relativo" (109 a 110).
- Detalhes: linhas 184 a 187, `if (detalhes) partes.push("Detalhes que o usuário deu:\n...")`. Lê `dados.detalhes` independente da etapa onde o campo vive: mover o campo de etapa não muda nada aqui.
- CTA: `ctaLinhas` (linha 158, definição perto de 47 a 86): traduz `objetivo` + `linkObjetivo` no botão principal.

### Upload antes da peça existir (o timing do wizard)

- `enviarAnexo` (`app/web/src/api/cliente.ts` 514 a 519) chama `POST /api/anexos` (`app/server/src/anexos.ts` 90 a 137), que grava em `materiais/cockpit/anexos/<AAAA-MM-DD>/` na pasta do VKOS ativo e devolve `caminhoRelativo` completo. NÃO depende da peça existir.
- A sessão de geração de site nasce com cwd na RAIZ do workspace (`app/server/src/sessoes/rotas.ts`: `pasta = obterPastaVkos()` linha 140, `pastaTrabalho = pasta` linha 158; o wizard não manda escopoPeca). Então `materiais/cockpit/...` é legível pela sessão. Este é o padrão estabelecido (o composer do cockpit referencia anexos assim, NoSessao.tsx 358 a 362).

### A galeria das Fontes de dados (a reusar)

- `app/web/src/componentes/editor/GaleriaFontes.tsx`. Props (15 a 19): `{ aberta, aoFechar, aoEscolher(arquivo: { contextoId, nome }) }`. Lê `contextos` do estado global, filtra imagens, miniaturas via `urlArquivoContexto(id, nome)` (`cliente.ts` 647 a 649). NÃO copia nada sozinha: delega ao callback.
- O helper do editor (`aplicarImagemDaFonte`, `editor/imagens.ts` 37 a 54) NÃO serve pro wizard: ele usa `POST /vkos/pecas/:pasta/imagem`, que exige a peça existir.

### O falso erro

- Auditoria: `auditarSiteEstatico` em `app/server/src/vkos/siteEstatico.ts` (192 a 267). Erros que reprovam: arquivo `.md` na pasta (201 a 206), `carrossel.html` (207 a 213), falta de `index.html` (215 a 217), caminho absoluto (238 a 243), referência pra fora da pasta (250 a 256), referência a arquivo inexistente (257 a 262), arquivo ilegível (223 a 227).
- Persistência: `app/server/src/vkos/pecas.ts` 66 a 84 grava `peca.site = { valido, erros, avisos, paginas }`.
- Front: `app/web/src/estado/geracao.tsx`. `pecaPronta` (137 a 145) exige `site.valido === true` pra site: peça inválida NUNCA conta como pronta. `pecaSumiu` (238 a 243): 8s depois da sessão concluir sem peça pronta, vira o estado de erro. `resultadoSemPeca` (147 a 157) monta "O site foi criado, mas a conferência encontrou: ..." com `peca.site.erros`.
- Mensagem: `AssistenteCriacao.tsx` 293 a 302: "O site ainda não está pronto" + "A sessão terminou, mas a conferência do site encontrou um problema."
- Hipóteses de falso positivo mapeadas: (1) referência com querystring/URL dinâmica que a regex de `referenciasHtml` (103 a 118) lê como arquivo; (2) `.md` deixado pela IA apesar da proibição do prompt (promptSite.ts 149); (3) normalização de caminho (encoding, caixa, `pagina/` vs `pagina.html`) em `destinoRelativo` (157 a 171) vs `caminhoExisteComoArquivo` (173 a 186); (4) import dinâmico em JS (`referenciasJs` 132 a 141).
- A TelaSite (`app/web/src/componentes/site/TelaSite.tsx`) abre a peça normalmente mesmo com `site.valido === false`; a barreira só age na publicação. Ou seja: hoje o wizard esconde um site que a própria TelaSite exibe sem drama.

## Peça 1: etapa "A estrutura" aberta

1. `DadosEtapasSite`: adicionar `objetivoLivre: string` (default "") e trocar `secoes: string[] | null` por `secoesLivre: string` (default ""). Remover `SECOES`, `IDS_SECAO`, `alternarSecao` e o bloco de chips de seção (402 a 428). Manter `objetivo` e `linkObjetivo` (mecânica do botão).
2. UI da etapa 1, nova ordem:
   - Textarea "Objetivo nº 1 do site" (`objetivoLivre`), placeholder: `Ex: fazer o visitante chamar no WhatsApp pra pedir orçamento; vender o pacote fotográfico premium; conseguir inscrições pra aula experimental...`. Campo opcional (vazio = o botão principal fala por si).
   - Bloco "Botão principal" (os chips de OBJETIVOS atuais + linkObjetivo, rebatizado de "Objetivo nº 1 do site" pra "Botão principal", hint curto: "O botão que fecha o objetivo. O link ou número vai nele.").
   - Textarea "Seções do site" (`secoesLivre`), oculta no formato "bio" como o bloco atual, placeholder: `Ex: uma abertura forte com foto, uma seção com os 3 pacotes e preços, depoimentos de clientes, um FAQ curto e o contato no final. Deixe vazio pro sistema escolher.`. Hint: "Descreva do seu jeito, em texto. Vazio = o sistema monta a estrutura pelo método da casa."
3. promptSite.ts:
   - `secoesLinhas` passa a receber `secoesLivre`: se vazio, a linha Auto atual intacta; se preenchido: `"Seções: monte a estrutura seguindo esta descrição do usuário, na ordem que ele deu (adapte nomes ao método da skill /site sem inventar seção que ele não pediu):\n" + secoesLivre`.
   - `objetivoLivre` entra logo depois da abertura do prompt: `if (objetivoLivre) partes.push("Objetivo numero 1 do site, definido pelo usuário:\n" + objetivoLivre)`. O `ctaLinhas` continua igual (mecânica do botão).
4. `etapaValida`: sem mudança (os campos novos são opcionais).

## Peça 2: "Com imagens" com galeria das Fontes

1. Card 2 da etapa 2: rótulo "Enviar minhas imagens" vira `Com imagens`, descrição vira `Use fotos das suas Fontes de dados ou envie novas.`. Valor `modoImagem: "com"` não muda.
2. Bloco "Suas imagens" (478 a 547) ganha, ACIMA do dropzone, um botão `Escolher das Fontes de dados` que abre `<GaleriaFontes aberta={...} aoFechar={...} aoEscolher={escolherDaFonte} />` (import de `../editor/GaleriaFontes`). O botão só aparece quando existe pelo menos uma imagem nas fontes (mesma checagem que a galeria faz: `contextos` do estado global filtrado por imagem; se não houver, mostrar o botão desabilitado com hint "Nenhuma imagem nas fontes ainda").
3. `escolherDaFonte(arquivo)`: `fetch(urlArquivoContexto(arquivo.contextoId, arquivo.nome))`, blob pra base64 (reusar `lerBase64` de `app/web/src/util/arquivo.ts`, que recebe File; pro blob, converter via `new File([blob], nome)` ou ler com FileReader direto), chamar `enviarAnexo({ nome, conteudoBase64 })` e empurrar `{ nome, caminhoRelativo }` em `dados.anexos`. Resultado idêntico ao upload: o prompt (`imagensLinhas`) não muda. Evitar duplicata: se o mesmo `nome` já está em `anexos`, não subir de novo (aviso curto inline).
4. Estado de enviando e erro inline no bloco, como o dropzone já tem. A galeria fecha ao escolher (um clique = um anexo; o usuário pode reabrir pra pegar outra).
5. Os chips/lista de anexos atuais (com remover) continuam servindo os dois caminhos.

## Peça 3: "Detalhes (opcional)" na última etapa

1. MOVER (não duplicar) o bloco do textarea `detalhes` da etapa 0 (322 a 330) pra etapa 3, posicionado antes do botão "Gerar site" (por volta de 552 a 640, depois do bloco de visual).
2. Placeholder novo: `Ex: tom mais sério; usar a frase "20 anos de estrada" no topo; não usar amarelo; incluir o Instagram no rodapé; página de obrigado depois do formulário...`. Rótulo continua "Detalhes (opcional)". Hint curto: "Última chance de pedir qualquer coisa antes de gerar."
3. promptSite.ts 184 a 187: sem mudança (já lê `dados.detalhes`).

## Peça 4: falso erro vira aviso honesto

1. INVESTIGAÇÃO PRIMEIRO (obrigatória, com evidência): localizar a peça do "site teste 03" no workspace ativo (procurar em `ojessegomes/conteudo/` e `estudio-aura/conteudo/` pastas de site recentes com "teste" ou "03" no nome; se não achar, pedir o nome ao Jesse). Ler a pasta, rodar a lógica de `auditarSiteEstatico` contra ela (ou chamar `GET /api/vkos/pecas` na 4600 e ler `peca.site.erros`). Registrar no relatório QUAL erro reprovou e a qual hipótese corresponde.
2. Front, a mudança principal (`app/web/src/estado/geracao.tsx`):
   - `pecaPronta` (137 a 145): pra tipo "site", passar a aceitar a peça quando ela EXISTE com `site` presente, válido OU não. A pendência não é mais "peça sumida".
   - Expor no estado da geração um campo novo `pendenciasSite: string[]` (os `peca.site.erros` quando `valido === false`), pra quem conclui a navegação poder avisar.
   - O fluxo de conclusão (AssistenteCriacao substitui a rota pela TelaSite) continua igual; a TelaSite passa a mostrar o aviso (item 3). O estado `pecaSumiu` continua existindo pros casos em que NADA foi gerado (sem pasta, sem index.html): aí o erro é real.
3. TelaSite: banner de pendência quando `peca.site.valido === false`: "O site está de pé. A conferência achou pendências que bloqueiam a publicação:" + lista curta dos erros + dica "Resolva pelo Ajustar com IA ou pelo modo Editar". Reusar o padrão visual de aviso que a tela já tem (conferir as classes existentes de erro/aviso em site.css antes de criar CSS novo). O botão Publicar continua bloqueado pela barreira como hoje.
4. AssistenteCriacao.tsx 293 a 302: o texto de `pecaSumiu` pra site só aparece agora no caso real (nada gerado). Ajustar o corpo pra dizer isso com verdade: "A sessão terminou mas nenhum site apareceu na pasta." (sem citar conferência).
5. Se a investigação do item 1 apontar heurística frágil da auditoria (querystring, caixa, `pagina/` vs `pagina.html`), corrigir a heurística em `siteEstatico.ts` com teste no padrão do server cobrindo o caso. Se apontar `.md` deixado pela IA, reforçar a linha 149 do promptSite.ts (elevar a proibição pra seção de exigências finais) E confirmar que com a peça 4 o usuário não vê mais tela de erro por isso.

## Ordem de execução e dependências

Fase 0 (investigação do caso real) primeiro: o resultado pode ajustar a peça 4. Depois peças 4, 1, 2, 3 em sequência (a 4 primeiro porque é a que muda contrato de estado; 1 a 3 são UI + prompt). Prova real por último.
