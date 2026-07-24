# VKOS 3.0 UI, sistema de design

A arquitetura de tema não muda: `global.css` define a base dos tokens e `visual-hub.css` carrega por último e fixa o valor final por tema. O que muda é o conteúdo: dois temas, tokens novos de escala, e a camada de componentes comuns.

## Temas

### Escuro (padrão)

Grafite neutro, o atual refinado. Fundo `#101312`, superfície `#171b19`, superfície elevada `#1e2320`, texto `#e9edeb`, texto suave `#a7b0ac`, borda `rgba(233,237,235,0.09)`. Menta `#2fd4a7` como único acento, glow só em foco e ação primária.

### Claro (off-white)

Nunca branco puro de fundo. Off-white neutro com um toque quase imperceptível do verde da marca:

- fundo: `#f4f6f5`
- superfície (cartões, painéis): `#fbfcfb`
- superfície elevada (modais, menus): `#ffffff` é proibido; usar `#fdfdfc`
- texto: `#1b1f1d` (contraste 4.5:1 ou mais contra qualquer superfície acima)
- texto suave: `#525a56` (conferir 4.5:1 contra o fundo; se falhar, escurecer)
- borda: `rgba(27,31,29,0.10)`
- menta no claro: escurecer o acento pra `#1d9d7a` em texto e ícones sobre fundo claro (o `#2fd4a7` não passa no contraste sobre off-white; manter o `#2fd4a7` só em superfícies escuras e no glow)

### Migração do terceiro tema

O Dark VKOS sai do seletor. Quem tiver `vkos` salvo no localStorage cai no Escuro sem erro. Remover os blocos `[data-theme="vkos"]` e o botão do seletor. Atualizar CLAUDE.md, CONTRATO.md e contexto ao final (falam em três temas).

## Tokens de escala (novos, em global.css)

```css
/* espaço: escala de 4 */
--esp-1: 4px;  --esp-2: 8px;  --esp-3: 12px; --esp-4: 16px;
--esp-5: 24px; --esp-6: 32px; --esp-7: 48px; --esp-8: 64px;

/* raio: dois valores */
--raio-m: 10px; --raio-g: 14px;

/* tipografia: uma família, escala fixa */
--fonte: sistema atual (manter);
--texto-12, --texto-13, --texto-15 (corpo), --texto-17, --texto-22, --texto-28, --texto-36;
/* títulos: peso 650-700, letter-spacing minimo -0.02em, text-wrap: balance */

/* motion */
--dur-1: 150ms; --dur-2: 220ms;
--curva: cubic-bezier(0.22, 1, 0.36, 1); /* ease-out-quint */

/* z-index semantico, unico lugar do app com z-index */
--z-flutuante: 10;   /* dropdown, popover */
--z-fixo: 20;        /* headers sticky, sidebar */
--z-veu: 30;         /* backdrop de modal */
--z-modal: 40;
--z-toast: 50;
--z-dica: 60;
```

Varredura obrigatória: substituir todo z-index arbitrário e todo espaçamento fora da escala pelos tokens. Nenhum componente declara cor, raio, sombra ou duração própria.

## Camada de componentes comuns

Criar em `app/web/src/componentes/comum/` (alguns já existem, consolidar):

- **Botão**: primário (menta), neutro, sutil (ghost) e perigo. Altura 36px padrão, 44px em telas de toque. Estados: hover, ativo, foco visível, ocupado (spinner interno), desabilitado.
- **Campo**: input, textarea e select com o mesmo desenho: rótulo em cima, ajuda ou erro embaixo, foco com anel menta de 2px.
- **Cartão**: superfície com borda e raio `--raio-g`, sem sombra no repouso, sombra curta só quando flutuante de verdade.
- **Aba**: o desenho das abas da Administração vira o padrão único (CRM, Conexões e demais migram pra ele).
- **Tabela e lista**: cabeçalho discreto, linhas com hover, célula de ação alinhada à direita.
- **Modal e confirmação**: um componente só, veu com fade `--dur-1`, painel com scale de 0.98 a 1.
- **Aviso e toast**: informação, sucesso, atenção, erro. Nunca borda lateral colorida; usar fundo tingido e ícone.
- **Estados padrão**: EstadoVazio (ilustração leve, uma frase, uma ação), EstadoCarregando (skeleton discreto, nunca spinner de página inteira), EstadoErro (mensagem honesta e botão tentar de novo).
- **ErrorBoundary**: por tela, com EstadoErro dentro (ver diagnóstico P0.2).

Regra de migração: a varredura de cada tela troca o CSS local por esses componentes e apaga o CSS que sobrar. O arquivo de estilo da tela mantém só o layout específico dela.

## Responsividade, regras duras

- Larguras de referência: 390 (celular), 768 (tablet), 1440 (desktop). Toda tela funciona nas três.
- O body nunca rola na horizontal. Conteúdo largo (tabela, canvas, kanban) rola dentro do próprio contêiner com `overflow-x: auto`.
- Grades responsivas sem media query quando possível: `repeat(auto-fit, minmax(280px, 1fr))`.
- Alvos de toque com no mínimo 44x44 no celular.
- `overflow: hidden` em contêiner de página é proibido (a lição do P0.3). Decoração recortada vive em camada própria.
- Testar sempre o estado mais alto e o mais largo de cada tela, não o médio.

## Motion

- Transição de tela: fade curto (`--dur-1`), sem deslizar a tela inteira.
- Hover e foco: `--dur-1`. Modais e painéis: `--dur-2`.
- Animar só transform e opacity. Nunca layout (width, height, top).
- `@media (prefers-reduced-motion: reduce)`: tudo vira transição instantânea ou crossfade. Já é regra da casa, conferir na varredura.
- As órbitas decorativas do acesso e afins: estáticas por padrão, movimento só se custar zero jank (a lição do mapa de sistema pesado continua valendo).
