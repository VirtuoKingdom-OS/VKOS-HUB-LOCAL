# Studio de Site: modo Editar na tela do site, sem drag livre

## Contexto

O Jesse pediu o editor manual profissional do site, irmão do Studio de carrossel, pra fechar a jornada do Site Guiado. O plano completo foi escrito em docs/planos/studio-site/ (2026-07-14) e executado em 2026-07-15 com 4 Opus + 1 Sonnet em três fases.

## Decisão

1. Uma tela só, dois modos: a TelaSite (#/site/<pasta>) ganhou o toggle Visualizar | Editar. Não nasceu rota nova. Visualizar mantém presets e Ajustar com IA; Editar liga o motor de edição e o painel de propriedades.
2. Sem drag livre de elemento: site é layout fluido responsivo, arrastar quebraria o mobile. No lugar: reordenar, duplicar e excluir seções inteiras, edição de texto in-place por duplo clique e ajustes de estilo pelo painel.
3. Estilos numa folha própria <style id="vkos-ajustes"> com âncoras data-vk e declarações com !important (o seletor [data-vk] tem especificidade baixa e perdia pra regras do site com classe; numa folha de override de editor, a intenção do usuário vence sempre). Escopo "geral" ou "só no celular" (@media 640px). Cores globais por :root override. O HTML gerado nunca recebe estilo inline.
4. Núcleo compartilhado: as primitivas do motor do carrossel (hit-test, contentEditable, snapshots, limpeza) foram extraídas pra editor/nucleo.ts; motor.ts manteve API e comportamento idênticos (regressão validada por gesto real), e editor/motorSite.ts nasceu por cima do núcleo.
5. Backend: PUT /vkos/pecas/:pasta/pagina/:arquivo espelha o padrão da gravação do carrossel (escrita atômica, .bak por boot, pecas:atualizadas), com carrossel.html proibido.

## Por quê

- Um destino só (a tela do site) evita o usuário decidir entre "ver" e "editar" antes de abrir.
- A folha de ajustes mantém o HTML gerado limpo, preserva as media queries do site e deixa o Ajustar com IA continuar entendendo o arquivo.
- O núcleo elimina a duplicação entre os dois editores sem arriscar o Studio de carrossel, que já estava validado.

## Registro da execução

QA de gesto real em 2026-07-15: 13 de 14 passos verdes, um bug alto (especificidade da folha) corrigido com !important e revalidado no site real. De quebra, o QA da fase 1 achou e corrigiu o .gitignore que engolia app/server/src/vkos/ (regra vkos/ virou /vkos/).
