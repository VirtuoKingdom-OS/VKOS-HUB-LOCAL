# Site Guiado v2: plano de execução (executor único, GPT 5.6 Sol)

Regras de sempre, valem em TODAS as fases: português brasileiro, sem travessão "—" nem "·", frase curta, cores só por tokens de `app/web/src/estilos/global.css`, tudo funciona nos 3 temas (Escuro, Dark VKOS, Claro), motion sutil, NUNCA commit nem push. Raiz: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPPv2`. Servidores possivelmente no ar (4600 backend, 5173 Vite): não derrubar. Comandos a partir de `app/`: `npm run checar -w web`, `npm run checar -w server`, `npm run testar -w server`, `npm run build -w web`.

Leia `01-visao.md` e `02-arquitetura.md` inteiros antes da Fase 0. Os detalhes de cada peça estão no 02; este arquivo é a ordem, os portões de verificação e o fechamento. NÃO avance de fase sem cumprir o portão da fase anterior.

## Fase 0: investigar o falso erro real (só leitura, nada de editar)

1. Localize a peça do "site teste 03": procure pastas de site recentes em `ojessegomes/conteudo/` e `estudio-aura/conteudo/` (nomes com "teste" ou "03"). Se a 4600 estiver no ar, `GET http://localhost:4600/api/vkos/pecas` e procure a peça de tipo "site" com `site.valido === false`. Se não achar, PARE e pergunte ao Jesse o nome da peça.
2. Leia `peca.site.erros` da peça (ou rode a lógica de `auditarSiteEstatico` de `app/server/src/vkos/siteEstatico.ts` contra a pasta manualmente). Anote o erro exato e classifique contra as 4 hipóteses do 02-arquitetura.md (seção "O falso erro").
3. Confirme que o site abre: abra `conteudo/<pasta>/index.html` da peça (via rota `/pecas/<pasta>/` da 4600 ou direto no navegador) e registre que renderiza.

**Portão da Fase 0**: relatório curto escrito (pode ser um bloco no seu log de trabalho): peça encontrada, erro exato da auditoria, hipótese correspondente, site renderiza sim ou não. Esse achado decide o item 5 da Fase 1.

## Fase 1: falso erro vira aviso honesto (peça 4 do 02-arquitetura.md)

1. `app/web/src/estado/geracao.tsx`: `pecaPronta` aceita site existente com `site` presente (válido ou não); novo campo `pendenciasSite: string[]` no estado da geração; `pecaSumiu` continua cobrindo o caso de nada gerado.
2. `app/web/src/componentes/site/TelaSite.tsx`: banner de pendências quando `peca.site.valido === false`, com o texto do 02 (peça 4 item 3), reusando classes de aviso existentes de `site.css`.
3. `AssistenteCriacao.tsx` 293 a 302: texto do caso real ajustado ("A sessão terminou mas nenhum site apareceu na pasta.").
4. NÃO mexa na barreira de publicação nem no `auditarSiteEstatico` ainda.
5. Conforme o achado da Fase 0: se foi heurística frágil, corrija a heurística em `siteEstatico.ts` COM teste novo no padrão do server (referência: os testes existentes em `app/server/src/`); se foi `.md` deixado pela IA, mova a proibição da linha 149 do `promptSite.ts` pras exigências finais do prompt (169 a 182) em posição de destaque.

**Portão da Fase 1**: `npm run checar -w web` e `-w server` limpos; `npm run testar -w server` verde; simulação verificável: com a peça do teste 03 ainda inválida no disco, a TelaSite dela mostra o banner de pendências (abra `http://localhost:5173/#/site/<pasta>` e confira; se a 5173 não estiver no ar, `npm run build -w web` e confira na 4600). Screenshot ou descrição honesta do que viu.

## Fase 2: etapa "A estrutura" aberta (peça 1)

1. `EtapasSite.tsx`: campos `objetivoLivre` e `secoesLivre` no lugar do desenho atual, UI na ordem do 02 (textarea objetivo, bloco "Botão principal", textarea seções com placeholder e hint), chips de `SECOES` removidos junto com `alternarSecao` e `IDS_SECAO`.
2. `promptSite.ts`: `secoesLinhas` pela descrição livre, `objetivoLivre` injetado depois da abertura, `ctaLinhas` intacto.
3. Confira que nenhum outro arquivo importa `SECOES`/`IDS_SECAO` de EtapasSite (grep antes de apagar).

**Portão da Fase 2**: typecheck web limpo. Prova do prompt SEM gastar sessão: adicione temporariamente um `console.log(montarPromptSite(dados, "teste"))` ou, melhor, escreva um teste rápido de montagem (se houver padrão de teste no web; senão, cole no relatório o prompt montado com dados de exemplo preenchendo objetivoLivre e secoesLivre) e confirme que o texto reflete os dois campos. Remova qualquer log temporário depois.

## Fase 3: "Com imagens" com galeria das Fontes (peça 2)

1. `EtapasSite.tsx` etapa 2: card renomeado ("Com imagens", "Use fotos das suas Fontes de dados ou envie novas."), botão "Escolher das Fontes de dados" acima do dropzone, `<GaleriaFontes>` importada de `../editor/GaleriaFontes`, `escolherDaFonte` conforme o 02 (fetch da fonte, base64, `enviarAnexo`, empurra em `dados.anexos`, sem duplicata pelo nome).
2. Estado de enviando e erro inline; galeria fecha ao escolher; lista de anexos com remover serve os dois caminhos.

**Portão da Fase 3**: typecheck web limpo. Gesto real no navegador (5173 ou build na 4600): abrir `#/criar/site`, ir à etapa de imagens, selecionar "Com imagens", abrir a galeria, escolher uma imagem de uma fonte existente (se o workspace ativo não tiver fonte de imagens, crie uma pela tela Fontes de dados com 1 arquivo, e apague depois), ver o chip do anexo aparecer, e conferir NO DISCO que o arquivo caiu em `materiais/cockpit/anexos/<data>/`. Também subir uma do computador pelo dropzone e ver os dois anexos juntos na lista.

## Fase 4: detalhes na última etapa (peça 3)

1. Mover o bloco `detalhes` da etapa 0 pra etapa 3, antes do botão Gerar site, com o placeholder e hint novos do 02.

**Portão da Fase 4**: typecheck web limpo; no navegador, a etapa 0 não tem mais o campo e a etapa 3 tem, com o placeholder novo; os 3 temas conferidos por cima nas telas mexidas (etapas 1, 2 e 3 do wizard).

## Fase 5: prova real de ponta a ponta (UMA sessão de IA, custa dinheiro)

1. No workspace de teste (Estúdio Aura, nunca o OJESSEGOMES sem aval), abra `#/criar/site` e preencha de verdade: tema real curto, objetivoLivre preenchido ("fazer o visitante chamar no WhatsApp pra orçamento", por exemplo), secoesLivre descrevendo 3 ou 4 seções específicas na ordem, "Com imagens" com 1 imagem da fonte + 1 upload, um detalhe na última etapa ("não usar amarelo", por exemplo). Gere.
2. Confira o resultado contra as entradas: as seções descritas existem na ordem pedida, as 2 imagens fornecidas foram usadas (copiadas pra `img/` da peça e referenciadas), o detalhe foi respeitado, o botão principal bate com o CTA escolhido.
3. Se a auditoria achar pendência na peça gerada: a geração deve concluir na TelaSite com o banner (comportamento novo da Fase 1), NÃO em tela de erro. Registre o que aconteceu.
4. Aval do Jesse antes de qualquer segunda geração. Se a primeira falhar por causa externa (API fora do ar), pode repetir a mesma UMA vez.

**Portão da Fase 5**: relatório da prova com o veredito por item do passo 2, honesto, incluindo o que a IA não respeitou (se houver).

## Fechamento

1. `npm run build -w web` a partir de `app/` e conferir que a 4600 serve o hash novo.
2. Atualizar `app/CONTRATO.md`: campos novos do wizard de site (objetivoLivre, secoesLivre, detalhes na etapa final), a galeria das Fontes na etapa de imagens (mesma rota /api/anexos), e o contrato novo da geração de site (peça existente com pendência conclui e avisa; pecaSumiu só quando nada foi gerado; publicação continua bloqueada por pendência).
3. Atualizar `contexto/arquitetura.md`: a linha do Site Guiado (seção "DECIDIDO 2026-07-14: Site Guiado HTML-first") ganha uma frase sobre o controle aberto, e a seção do contrato estático (DECIDIDO 2026-07-16) ganha a frase da conclusão honesta com pendência. Editar só as linhas, não reescrever.
4. Registrar decisão curta em `decisoes/AAAA-MM-DD-site-guiado-v2.md`: contexto (wizard rígido demais e falso erro minando confiança), decisão (estrutura em texto aberto, Com imagens com galeria das fontes, detalhes na última etapa, pendência de auditoria vira aviso sem soltar a barreira de deploy), por quê (controle do usuário na geração e honestidade do app; a auditoria protege o deploy, não deve esconder site que está de pé).
5. Avisar o Jesse com o resumo honesto: o que mudou, o achado da Fase 0 (a causa real do falso erro do teste 03), o resultado da prova real, e as ressalvas.
6. Perguntar ao Jesse se pode apagar a pasta `planos/site-guiado-v2/`.
