# Studio de Site: plano de execução

Regras de sempre (colar em TODO prompt de agente): português brasileiro, sem travessão "—" nem "·", frase curta, cores só por tokens de `app/web/src/estilos/global.css`, funciona nos 3 temas, sem backdrop-filter sobre canvas animado, NUNCA commit. Raiz: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPP`. Servidores no ar (4600 backend, 5173 Vite): não derrubar. Typecheck: `npm run checar -w web` e `npm run checar -w server` a partir de `app/`. Cada dono só toca os próprios arquivos.

Agentes: 4 Opus + 1 Sonnet, em três fases. Fase 2 só despacha quando a Fase 1 terminar (a API real do motorSite é a fronteira de B e C).

## Fase 1 (paralela): fundação

### Dono A (Opus): núcleo compartilhado e motor do site

Arquivos: `app/web/src/componentes/editor/nucleo.ts` (novo), `app/web/src/componentes/editor/motorSite.ts` (novo), `app/web/src/componentes/editor/motor.ts` (só refatoração interna).

Prompt pronto:

> Você é o Dono A da rodada Studio de Site do VKOS Hub. Leia primeiro os três arquivos de planos/studio-site/ (01-visao, 02-arquitetura, 03-execucao) e siga as regras de sempre. Sua missão: (1) extrair de motor.ts as primitivas descritas na peça 1 da arquitetura pra um novo editor/nucleo.ts, mantendo motor.ts com a MESMA API pública e o MESMO comportamento (refatoração interna, zero regressão no Studio de carrossel); (2) criar editor/motorSite.ts com o hook usarMotorSite conforme a peça 2 e a persistência da peça 3 (folha vkos-ajustes com data-vk, escopo geral ou mobile em max-width 640px, cores globais por :root override, serialização do documento inteiro preservando doctype, data-vk e a folha). O salvar() do hook recebe um callback de gravação (quem chama a API é a tela, dono B). Exponha a API do hook num comentário de contrato no topo do arquivo: os donos B e C constroem contra ela. Listeners de mouse e teclado no contentWindow do iframe, nunca no window do app. No modo edição, preventDefault em cliques de <a>. Ao final: npm run checar -w web limpo e relatório com a API pública do usarMotorSite.

### Dono D (Sonnet): backend de gravação

Arquivos: `app/server/src/vkos/rotas.ts`, `app/server/src/vkos/carrossel.ts` ou módulo novo `app/server/src/vkos/paginaSite.ts` (preferir módulo novo).

Prompt pronto:

> Você é o Dono D da rodada Studio de Site do VKOS Hub. Leia primeiro os três arquivos de planos/studio-site/ e siga as regras de sempre. Sua missão: a rota PUT /vkos/pecas/:pasta/pagina/:arquivo da peça 4 da arquitetura, espelhando fielmente o padrão da PUT /vkos/pecas/:pasta/carrossel que já existe em rotas.ts (validação de peça com resolverPeca, escrita atômica, backup .bak único por boot, bodyLimit 4MB, transmitir pecas:atualizadas). Validações do :arquivo: um único segmento, termina em .html, sem traversal, precisa existir na raiz da peça. PROIBIDO aceitar o nome carrossel.html (classificação de peça). Lógica de gravação num módulo novo paginaSite.ts com testes das validações se o server tiver padrão de teste; senão, validar com curl (caso feliz, traversal, arquivo inexistente, carrossel.html). Não tocar na rota de imagem (já serve). Ao final: npm run checar -w server limpo e relatório com os curls de validação.

## Fase 2 (paralela, após a Fase 1): a experiência

### Dono B (Opus): TelaSite com modo Editar

Arquivos: `app/web/src/componentes/site/TelaSite.tsx`, `app/web/src/estilos/site.css`.

Prompt pronto:

> Você é o Dono B da rodada Studio de Site do VKOS Hub. Leia primeiro os três arquivos de planos/studio-site/, a API de contrato no topo de editor/motorSite.ts (dono A, já entregue) e o relatório do dono A. Siga as regras de sempre. Sua missão: a peça 5 da arquitetura, MENOS o painel de propriedades (dono C, paralelo, arquivo componentes/site/PainelSite.tsx com props definidas na interface da rodada abaixo): toggle Visualizar | Editar no topo da TelaSite, modo Editar ligando o usarMotorSite no iframe, zoom Ajustar/50/75/100 no modo Editar (padrão do TelaStudio), presets Desktop e Mobile funcionando nos dois modos, Ctrl+S salvando pela rota PUT /vkos/pecas/:pasta/pagina/:arquivo (dono D, entregue), Ctrl+Z desfazendo, guarda de estado sujo (trocar página, modo, disparar Ajustar com IA ou sair pede confirmação; salvar antes de disparar a IA), aviso de conflito externo sem recarregar por cima (peça 5). Interface da rodada pro painel: PainelSite recebe { motor (retorno do usarMotorSite), pecaPasta, arquivoAtual, aoFechar }. Renderize-o quando o modo Editar está ativo. Se o arquivo PainelSite.tsx ainda não existir quando você começar, crie um stub mínimo com essas props e avise no relatório (o dono C sobrescreve). Ao final: npm run checar -w web limpo e relatório.

### Dono C (Opus): painel de propriedades do site

Arquivos: `app/web/src/componentes/site/PainelSite.tsx` (novo ou sobrescrever stub), adições em `app/web/src/estilos/site.css` APENAS em bloco próprio no fim do arquivo marcado com o comentário `/* ===== PainelSite ===== */` (fronteira com o dono B no mesmo css).

Prompt pronto:

> Você é o Dono C da rodada Studio de Site do VKOS Hub. Leia primeiro os três arquivos de planos/studio-site/, a API de contrato no topo de editor/motorSite.ts (dono A, entregue) e o PainelPropriedades do Studio de carrossel (componentes/studio/) como referência de padrão visual. Siga as regras de sempre. Sua missão: o PainelSite da peça 5 da arquitetura, com props { motor, pecaPasta, arquivoAtual, aoFechar }: edição de texto do selecionado, tipografia (fonte, tamanho, peso, cor), cor de fundo do bloco, seletor de escopo geral ou só no celular, campo de link quando o selecionado é <a> com atalho WhatsApp (monta https://wa.me/ do número só de dígitos), trocar imagem quando é <img> (upload pela rota POST /vkos/pecas/:pasta/imagem existente, mesmo fluxo do Studio de carrossel), lista de seções da página (subir, descer, duplicar, excluir com confirmação) e grupo de cores globais lendo as variáveis :root expostas pelo motor. Estados vazios com dica ("Clique num elemento do site pra editar"). Só toque no site.css dentro do bloco marcado /* ===== PainelSite ===== */ no fim. Ao final: npm run checar -w web limpo e relatório.

## Fase 3: QA de gesto real (Opus)

Prompt pronto:

> Você é o QA de gesto real da rodada Studio de Site do VKOS Hub. Leia os três arquivos de planos/studio-site/ e os relatórios dos donos. Playwright real em http://localhost:5173, viewport 1440x900, screenshots de cada passo. Regras da casa: QA valida usabilidade em tamanho real, não só presença; sessões de IA reais custam dinheiro, dispare no máximo UMA (e sem turno de cortesia). Roteiro: (1) abrir um site existente em #/site/<pasta>, entrar no modo Editar; (2) duplo clique num título e trocar o texto; (3) pelo painel: mudar cor e tamanho do título com escopo geral, e o tamanho com escopo só no celular; conferir no preset Mobile que a regra mobile pegou e no Desktop que não vazou; (4) editar o href de um CTA pelo atalho WhatsApp; (5) reordenar uma seção (subir) e duplicar outra; (6) trocar uma imagem se o site tiver, senão anotar; (7) Ctrl+Z desfaz a última ação; (8) Ctrl+S salva: conferir no disco que a página foi regravada com a folha vkos-ajustes e sem artefato de editor, que nasceu o .bak, e que F5 preserva tudo; (9) guarda de sujo: editar sem salvar e tentar trocar de página (deve pedir confirmação); (10) com tudo salvo, disparar UM Ajustar com IA pequeno e conferir que convive com as edições manuais; (11) mobile não quebrado: screenshot 390px da página editada; (12) REGRESSÃO do Studio de carrossel: abrir peça de carrossel no #/studio, duplo clique edita, drag com snap funciona, Ctrl+S salva (sem gerar peça nova); (13) regressão do wizard Site Guiado só até a etapa 2 (cancelar sem gerar); (14) os 3 temas na TelaSite em modo Editar. Relatório: matriz passo a passo com veredito, bugs com severidade e arquivo:linha, screenshots. Não conserte nada: só reporte.

## Checklist de fechamento (executor)

1. Typecheck web e server limpos.
2. Bugs do QA de severidade média pra cima: corrigir (agente de fix ou na mão) e revalidar o gesto afetado.
3. `npm run build -w web` a partir de `app/` e conferir que a 4600 serve o hash novo (lição da rodada 17: o Jesse usa a 4600, que serve o web/dist compilado).
4. Registrar decisão em `decisoes/AAAA-MM-DD-studio-de-site.md` (contexto, decisão, por quê) e atualizar `contexto/arquitetura.md` e `contexto/roadmap.md` na linha certa.
5. Avisar o Jesse com o resumo honesto e o que ficou de ressalva.
6. Perguntar ao Jesse se pode apagar a pasta `planos/studio-site/`.
