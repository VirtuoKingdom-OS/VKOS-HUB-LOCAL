# Studio de Site: visão de produto

## O que é

O editor manual do site gerado pelo Site Guiado. O usuário abre o site na tela `#/site/<pasta>` e alterna entre dois modos:

- **Visualizar**: o que já existe hoje. Presets Desktop e Mobile, seletor de páginas, abrir em nova aba, atualização ao vivo, painel Ajustar com IA.
- **Editar**: o modo novo. Edição direta no canvas (duplo clique no texto), painel de propriedades à direita, reordenação de seções, troca de imagem, edição de links e CTAs, cores globais. Ctrl+S salva, Ctrl+Z desfaz.

O Ajustar com IA continua existindo e convive com a edição manual: a IA pros ajustes grandes, a mão pro acabamento fino.

## Decisões de produto (fechadas neste plano)

### 1. Uma tela só, dois modos

A TelaSite atual evolui pra ganhar o modo Editar. Não nasce rota nova nem tela nova.

Por quê: o usuário não deveria decidir entre "ver" e "editar" antes de abrir. Ele abre o site, olha, e liga a edição quando quiser. É o mesmo destino do "Ver o site" do fluxo guiado, dos recentes e da galeria: zero mudança nos caminhos que já funcionam.

Alternativa descartada: tela `#/studio-site/<pasta>` separada, espelhando o carrossel. Descartada porque duplicaria viewport, seletor de páginas e atualização ao vivo que a TelaSite já tem.

### 2. Sem drag livre de elementos

O Studio de carrossel tem drag com snap porque o slide é um palco de tamanho fixo com posição absoluta. Site é layout fluido e responsivo: arrastar um elemento pra posição arbitrária quebra o mobile e o refluxo do texto.

No lugar do drag, o Studio de Site oferece o que um editor de site profissional oferece:

- Reordenar seções inteiras (subir, descer, duplicar, excluir com confirmação).
- Ajustes de estilo pelo painel: tipografia, cores, espaçamento do bloco.
- Edição de texto in-place por duplo clique (idêntica à do carrossel).

### 3. Escopo de estilo: geral ou só no celular

Toda mudança de estilo pelo painel vale pros dois tamanhos por padrão. O painel tem a opção "só no celular" pra regra que deve valer apenas em telas pequenas (max-width 640px). Assim o usuário conserta um título gigante no mobile sem tocar no desktop.

### 4. O que fica de fora desta rodada

- Adicionar seção nova do zero (biblioteca de blocos). Fica pra depois: duplicar seção existente já cobre boa parte.
- Editar o menu de navegação como estrutura (links seguem editáveis um a um).
- Publicação (Netlify e afins). É outra fase do roadmap.
- Edição simultânea de várias páginas lado a lado: site edita uma página por vez, com abas.

## Critério de fechamento

O Jesse abre um site gerado, entra no modo Editar, troca um texto, uma cor, um link de CTA, reordena uma seção, salva, recarrega e está tudo lá, com o mobile intacto. E o Studio de carrossel continua funcionando exatamente como antes.
