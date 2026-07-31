# O glow fica, mas só marca estado

## Contexto

O `05-design-system.md` propôs matar quase todo o glow. A medição por trás disso é real: o menta aparecia em 279 chamadas com 49 valores de alpha diferentes, e o glow estava em fundo de botão, hover de cartão, item selecionado e moldura de painel. Nada disso carrega informação.

Só que o `CLAUDE.md` diz, na identidade da VK, "minimalista, verde-menta, glow sutil". Matar o glow inteiro contraria a identidade que o dono declarou. O problema nunca foi o glow existir, foi ele estar em toda parte.

## Decisão

O glow fica. São três tokens, e só três, declarados em `global.css` na camada base:

- `--glow-vivo`: o que está acontecendo agora. Sessão rodando, conexão ligada, passo em andamento. É o único que pulsa.
- `--glow-foco`: o anel de foco de teclado, junto do `outline` de menta.
- `--glow-acao`: a ação principal da tela. Uma por tela, no máximo.

Onde ele **nunca** entra: superfície grande, texto corrido, borda decorativa, hover de cartão, item selecionado, moldura de painel.

Quem quer marcar hover ou seleção usa a escada de superfície mais o fio de `--linha`, que é de onde a profundidade sai agora.

Aplicado: 22 glows saíram, 7 ficaram. Os que ficaram estão em `.no-sessao.rodando`, `.passo-pino.ativo`, `.cerimonia-selo.pronto`, `.conx-cartao.ligado`, `.no-contexto.carregando`, `.botao-principal` e `.dash-hero-icone`.

Os nomes antigos `--glow` e `--glow-forte` seguem como apelido de `--glow-acao` e `--glow-vivo` até a etapa de limpeza.

## Por quê

Glow que marca estado é informação: ele responde "a IA está trabalhando?" sem ler nada. Glow que decora é ruído, e ruído numa tela com quarenta cartões cobra atenção sem devolver nada.

A régua da Linear é literal sobre isso: a cor de destaque fica reservada para marca, ação primária, anel de foco e indicador de estado, e nunca preenche cartão nem vira fundo de seção. A Apple diz o mesmo na página de Cor: "aplique cor com parcimônia, reserve para ações primárias e indicadores de estado".

E tem o custo medido: cada gradiente ambiente de menta empurrava para baixo o contraste do texto por cima dele. Saíram 23 camadas de gradiente de menta do CSS nesta rodada. Elas eram exatamente o glow que ninguém enxergava conscientemente e que todo mundo pagava.

A alternativa, matar tudo, resolveria o ruído e apagaria junto o sinal de sessão viva, que é a informação mais importante da tela num app onde várias IAs trabalham em paralelo. Não vale.
