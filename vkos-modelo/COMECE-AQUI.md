# 👋 Comece aqui

Bem-vindo ao **VKOS 2**. Em uns 15 minutos seu sistema de marketing vai estar de pé. Você não
precisa saber nada de computador além de abrir uma pasta e digitar. Vamos com calma.

---

## O que é o VKOS, em uma frase

É um assistente de marketing que **já conhece o seu negócio** e faz o trabalho pesado por você:
conteúdo, perfil, site, Google, anúncios. Ele funciona dentro de um programa gratuito chamado
**Claude Code**. É só isso que você precisa instalar.

Nesta versão 2, todo o visual (carrossel, stories, site) nasce com uma camada de design
própria, e o sistema também constrói projetos livres com você (digite `/projeto`).

---

## Passo 0: Pegue a pasta do VKOS

Depois da compra, você recebe o **acesso ao VKOS** (um link pra baixar, ou a área de membros da
VirtuoKingdom onde ele fica disponível). Faça assim:

1. Abra o link (ou entre na área de membros) e **baixe o arquivo do VKOS**. Ele vem compactado,
   num arquivo terminado em **.zip**.
2. Ache o arquivo baixado (normalmente vai pra pasta **Downloads**), clique com o botão direito
   nele e escolha **Extrair** (ou "Descompactar"). Isso cria a pasta do VKOS de verdade.
3. Arraste essa pasta pra um lugar fácil de achar, tipo a **Área de Trabalho**. Guarde ela ali.

> Ficou com dúvida em algum passo? Sem estresse. Você vai voltar nessa pasta nos próximos
> passos, então deixe ela num canto que você lembre.

---

## Passo 1: Instale o Claude Code

O Claude Code é o "motor" do VKOS. Ele existe em duas formas, escolha a que for mais fácil
pra você:

- **No VS Code (recomendado, mais visual):** instale o [VS Code](https://code.visualstudio.com/)
  (gratuito), abra ele, vá na aba de **Extensões** (o ícone de quadradinhos na lateral),
  procure por **"Claude Code"** e clique em Instalar.
- **No terminal:** se você já usa terminal, siga as instruções em
  [claude.com/claude-code](https://claude.com/claude-code).

Na primeira vez, o Claude Code vai pedir pra você **entrar com sua conta Anthropic**. É ela que
dá "energia" pro sistema. Siga o login que ele mostrar na tela.

> Não tem conta? Ele te leva pra criar na hora. Guarde esse login, é o que mantém o VKOS
> funcionando.

**Sobre o custo, sem rodeio:** o Claude Code funciona com uma conta da Anthropic num plano pago
(a partir do plano básico). Essa assinatura fica na sua conta e é ela que aciona todo o sistema,
é o motor que faz o VKOS trabalhar. Não é cobrança da VirtuoKingdom, é o combustível do Claude
que você contrata direto com a Anthropic.

---

## Passo 2: Instale o Node.js

O Node.js é um programa gratuito que o VKOS usa nos bastidores pra **transformar o texto dos
carrosséis e stories em imagem pronta pra postar**. Sem ele, o sistema escreve, mas não gera as
imagens.

1. Entre em [nodejs.org](https://nodejs.org/).
2. Baixe a versão marcada como **LTS** (é a versão estável, recomendada).
3. Abra o arquivo baixado e instale clicando em **avançar** até o fim. Não precisa mudar nada.

Feito uma vez, não precisa mexer de novo.

---

## Passo 3: Abra a pasta do VKOS

1. Pegue a pasta do VKOS que você deixou guardada no Passo 0 (ex: na Área de Trabalho).
2. No VS Code, vá em **Arquivo → Abrir Pasta...** e escolha a pasta **vkos2**.
3. Abra o Claude Code (o ícone dele na lateral, ou o atalho que a extensão mostra).

⚠️ **Importante:** abra a pasta **vkos2** inteira, não um arquivo solto de dentro dela. É isso
que faz os comandos funcionarem.

---

## Passo 4: Digite `/instalar`

Na caixa de conversa do Claude Code, digite:

```
/instalar
```

e dê Enter. Ele vai te fazer algumas perguntas simples sobre o seu negócio: o que você vende,
pra quem, como você fala. Responda do seu jeito, sem se preocupar em ficar bonito. No fim, ele
monta o **Cérebro** do seu negócio: o documento que faz todo o resto sair com a sua cara.

Feito isso, **seu VKOS está pronto.**

> **Ainda não sabe o que vender, ou pra quem?** Sem problema, é mais comum do que parece.
> Em vez de `/instalar`, digite **`/ikigai`**. Ele te ajuda, numa conversa, a achar a direção
> (o que oferecer, pra quem, e por que você) antes de montar o Cérebro.

---

## E agora?

Digite `/vkos` a qualquer momento pra ver tudo que dá pra fazer. Um bom primeiro teste:

```
/semana
```

Dê uma ideia e veja o sistema montar uma semana inteira de conteúdo pra você.

---

## Se algo der errado

Não entre em pânico. **Escreva pro Claude Code o que aconteceu** ("não achei o comando",
"deu um erro", "não sei abrir a pasta") e ele responde em português simples e te desencalha.
O VKOS foi feito pra você conseguir, mesmo começando do zero.

---

## Se o carrossel não gerar imagem

Na primeira vez que você cria um carrossel, o sistema precisa baixar um navegador interno pra
montar as imagens. Isso acontece uma vez só e precisa de **internet** na hora. Pode demorar um
pouquinho, é normal.

Se por acaso der algum erro e a imagem não sair, não se preocupe. É só escrever pro Claude Code:
**"o carrossel não renderizou, me ajuda"**. Ele resolve pra você (inclusive rodando o comando
que baixa esse navegador, o `npx playwright install chromium`, se for o caso).
