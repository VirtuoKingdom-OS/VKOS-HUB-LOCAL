# Onde as coisas moram: a árvore do repositório

## Contexto

O Jesse pediu a pasta organizada em nível de produção. O levantamento achou
quatro problemas concretos, não de gosto:

1. **`estudio-aura/` e `ojessegomes/` estavam versionados**, 129 arquivos com
   dois Cérebros preenchidos de 6KB e 15KB. Entraram no commit `7ac5048`, de um
   `git add` geral. O `.gitignore` já tinha as duas linhas, mas ignore não
   desrastreia o que já entrou, então as regras davam falsa sensação de
   proteção.
2. **`estilos/` era um depósito de 20 folhas**, longe dos componentes que elas
   vestem. Ver a folha de uma tela exigia sair da pasta da tela.
3. **`server/src` tinha 9 arquivos soltos** ao lado de 17 pastas de módulo,
   sem critério visível para a diferença.
4. **A raiz tinha 14 arquivos soltos**, incluindo um `logo.png.PNG` que era
   duplicata byte a byte do `app/web/public/logo.png` e não era referenciado por
   nada. Ele só sobrevivia por uma exceção `!logo.png.PNG` no `.gitignore`.

## Decisão

```
app/                    o produto
  server/src/
    index.ts            entrada
    tipos.ts            contrato compartilhado
    nucleo/             transporte: ws.ts e spa.ts
    <dominio>/rotas.ts  um módulo por domínio
  web/src/
    estilos/            só o contrato da cascata
    componentes/<area>/ componente e folha juntos
docs/                   contexto, decisões, planos, COMECE-AQUI
interno/                dados que o app lê rodando
ferramentas/            scripts de conferência
```

O que **não** se mexeu, e por quê:

- **`app/` mantém o nome.** O `workspaces/integrado.ts` faz
  `resolve(pastaApp, "..")` e procura `VKOS/` ao lado. O `ambiente/setup.ts`
  monta o atalho apontando para `Iniciar VKOS Hub.cmd` na raiz. Renomear para
  `apps/` quebraria o boot do pacote do cliente para ganhar familiaridade
  nenhuma que o projeto precise hoje.
- **Os dois `.cmd` e o `LEIA-ME.md` ficam na raiz.** A raiz do repositório é a
  raiz do pacote que o cliente extrai. Enterrar o inicializador numa subpasta
  piora a vida de quem só quer clicar duas vezes.
- **`interno/` fica fora de `docs/`.** O `mapa/rotas.ts` lê aqueles JSON em
  execução. Colocar dado de runtime dentro de documentação seria erro de
  categoria, e o Mapa responderia "indisponível" em silêncio se o caminho
  quebrasse.
- **`canvas.css` continua em `estilos/`.** Ele tem 2739 linhas e mistura o
  canvas do cockpit com os primitivos compartilhados (botão, campo, modal,
  popover) que a Etapa 4 do design system ainda não extraiu. Movido para
  `componentes/cockpit/`, esses primitivos só carregariam quando o cockpit
  montasse. Separar é trabalho próprio, não efeito colateral desta rodada.

## Por quê

O ganho de organizar pasta é encurtar a distância entre a pergunta e o arquivo.
Folha ao lado do componente responde "onde está o estilo do CRM" sem sair da
pasta. Módulo com `rotas.ts` responde "onde entra a rota" sem procurar.

O contrário também vale: mover coisa que outro sistema resolve por caminho é
trocar organização por defeito. Foi o que quase aconteceu com o `mapa`, que
subiu de `src/mapa.ts` para `src/mapa/rotas.ts` e passou a contar um nível a
menos até `interno/`. O sintoma seria o Mapa sumindo da barra, que é
exatamente o que ele faz quando o arquivo não existe: falha silenciosa.

A mudança que mais importa é a primeira, e ela é de segurança, não de estética.
Repositório privado hoje não é privado para sempre: basta um colaborador, um
espelho ou uma abertura de código. E um produto que promete que o dado do
cliente não sai da máquina não pode carregar o Cérebro de dois clientes dentro
do próprio código.

**O que esta decisão NÃO faz:** os arquivos saíram do índice, não do histórico.
Quem clonar o repositório e voltar até `7ac5048` continua enxergando tudo.
Limpar o histórico exige reescrita com `git filter-repo` e um push forçado, que
é destrutivo e some com hash de commit. Fica registrado aqui como pendência
consciente, para ser decidido antes de qualquer abertura do repositório.
