# Studio de Site: arquitetura técnica

Estado do código em 2026-07-14 (rodada 17 entregue). O executor deve reconferir os arquivos citados antes de despachar.

## Base existente que este plano reutiliza

- `app/web/src/componentes/editor/motor.ts`: o motor de edição do carrossel (hook `usarMotorEdicao`). Tem as primitivas que o site precisa: snapshot e desfazer, duplo clique vira contentEditable no elemento mais profundo com texto, serialização que remove artefatos, troca de imagem.
- `app/web/src/componentes/site/TelaSite.tsx`: a tela do site (viewport escalado com presets, seletor de páginas, cache-bust ao vivo, painel Ajustar com IA com estado local).
- `app/server/src/vkos/rotas.ts`: `PUT /vkos/pecas/:pasta/carrossel` (linha ~229) grava com escrita atômica, backup .bak único por boot e `transmitir({ tipo: "pecas:atualizadas" })`. `POST /vkos/pecas/:pasta/imagem` (linha ~262) salva imagem base64 em `<peca>/img/` e devolve `{ caminhoRelativo }`: essa rota é genérica por peça e serve pro site SEM mudança.
- `app/web/src/componentes/studio/TelaStudio.tsx` e `estilos/studio.css`: padrão visual de referência (topo, zoom, painel de propriedades à direita).

## As cinco peças da arquitetura

### 1. Núcleo compartilhado: `editor/nucleo.ts` (novo)

Extrair de `motor.ts` as primitivas que não dependem de slide:

- Pilha de snapshots e desfazer.
- Entrada e saída do modo contentEditable in-place (com preservação de filhos inline).
- Hit-test do elemento mais profundo com texto direto no ponto clicado.
- Limpeza de artefatos do editor na serialização (contenteditable, atributos `data-ed-*`, outlines de seleção).

Regra de ouro: `motor.ts` continua exportando a MESMA API pública de hoje e o Studio de carrossel não muda de comportamento em nada. A extração é refatoração interna; o QA testa a regressão.

### 2. Motor do site: `editor/motorSite.ts` (novo)

Hook `usarMotorSite(iframeRef, opcoes)` operando no documento inteiro da página carregada no iframe (não em slides). Responsabilidades:

- Seleção por clique (elemento mais profundo com texto, ou o container), realce visual, Esc desmarca.
- Duplo clique edita texto in-place (núcleo).
- Aplicar estilo num elemento com escopo `"geral"` ou `"mobile"` (ver persistência abaixo).
- Definir `href` de um link selecionado.
- Trocar `src` de imagem selecionada (mesmo fluxo do carrossel: upload via rota de imagem, caminho relativo).
- Seções: listar os filhos de nível de seção do body (`header`, `section`, `footer`, e `div` direto do body com altura relevante), mover pra cima e pra baixo, duplicar, excluir.
- Estado sujo, salvar, desfazer. Listeners anexados no contentWindow do iframe (lição da rodada 13: listener no window do app não recebe evento de dentro do iframe).

### 3. Persistência das edições

- **Texto**: direto no HTML da página (contentEditable), como no carrossel.
- **Links**: direto no atributo `href`.
- **Imagens**: direto no atributo `src`, apontando pra `img/...` relativo.
- **Seções**: reordenação e duplicação mexem no DOM direto; a serialização grava a ordem nova.
- **Estilos**: NUNCA inline no elemento. Vão pra uma folha própria `<style id="vkos-ajustes">` no fim do `<head>` da página. Cada elemento estilizado recebe um id curto estável `data-vk="a1"` e a folha ganha a regra `[data-vk="a1"] { ... }`. Escopo mobile embrulha em `@media (max-width: 640px)`.
- **Cores globais**: se a folha principal da página define variáveis em `:root` (o padrão dos princípios visuais do VKOS), o painel lista essas variáveis e as sobrescreve num bloco `:root { }` dentro do `vkos-ajustes`. A folha original nunca é tocada.

Por quê a folha própria: inline vence qualquer media query e quebraria o mobile silenciosamente; a folha separada mantém o HTML gerado limpo, é fácil de serializar, fácil de resetar, e o Ajustar com IA continua entendendo o arquivo.

- **Serialização**: o documento inteiro da página, menos os artefatos do editor. Os atributos `data-vk` e a folha `vkos-ajustes` FICAM (são as âncoras das regras). Doctype preservado.

### 4. Backend: rota de gravação de página (nova)

`PUT /vkos/pecas/:pasta/pagina/:arquivo`, corpo `{ texto }`, espelhando a rota do carrossel:

- `:arquivo` é um único segmento terminando em `.html`, validado contra path traversal, e precisa já existir na raiz da peça (a rota grava, não cria página).
- Escrita atômica, backup `.bak` único por boot, `bodyLimit` 4MB, `transmitir({ tipo: "pecas:atualizadas" })` no fim.
- A rota de imagem existente (`POST /vkos/pecas/:pasta/imagem`) é reutilizada sem mudança.

### 5. UI: TelaSite ganha modo Editar e painel

- Toggle Visualizar | Editar no topo. O modo Editar liga o `usarMotorSite` no iframe e abre o painel de propriedades à direita (o painel Ajustar com IA e o de propriedades não ficam abertos ao mesmo tempo).
- No modo Editar o zoom segue o padrão do Studio: Ajustar (padrão), 50, 75, 100. Os presets Desktop e Mobile continuam valendo (a edição funciona nos dois; regra "só no celular" casa com o preset Mobile pra conferência imediata).
- Painel de propriedades (`componentes/site/PainelSite.tsx`, novo): texto do elemento, fonte, tamanho, peso, cor, cor de fundo do bloco, escopo geral ou só no celular, campo de link quando o selecionado é `<a>` (com atalho "WhatsApp" que monta wa.me do número), trocar imagem quando é `<img>`, lista de seções da página com subir, descer, duplicar, excluir, e o grupo de cores globais (`:root`).
- Ctrl+S salva, Ctrl+Z desfaz (espelhados de dentro do iframe pro app, lição da rodada 13). Esc desmarca, não sai do modo.
- Guarda de estado sujo: trocar de página, trocar de modo, disparar Ajustar com IA ou sair da tela com edição não salva pede confirmação (salvar antes de disparar a IA, senão a edição local se perde quando o arquivo muda em disco).
- Conflito externo: se `pecas:atualizadas` chega com edição não salva no modo Editar, NÃO recarregar o iframe por cima do trabalho; mostrar aviso "o site mudou por fora" com opção de recarregar ou manter.

## Riscos conhecidos

- Sites gerados variam de estrutura (o prompt não impõe esqueleto). A detecção de seções precisa ser tolerante: na dúvida, tratar filho direto do body como seção.
- Scripts do site (menu hambúrguer, reveal on-scroll) rodam durante a edição. O motor precisa neutralizar cliques de navegação no modo Editar (preventDefault em `<a>`) sem quebrar os scripts na visualização.
- `carrossel.html` e `.md` continuam proibidos na pasta da peça (classificação). A serialização nunca cria arquivo novo, só regrava a página aberta.
