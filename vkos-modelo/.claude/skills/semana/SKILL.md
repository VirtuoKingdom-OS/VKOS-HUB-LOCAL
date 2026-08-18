---
name: semana
description: >
  O motor do VKOS. Pega UMA ideia e monta uma semana inteira de conteúdo alinhado: carrossel,
  stories e legendas, tudo com a cara do negócio. Use quando o comprador disser /semana, "monta
  minha semana", "preciso de conteúdo pra semana", "me dá uma semana de posts", ou quando ele
  estiver perdido sobre o que postar.
---

# /semana: De 1 ideia a uma semana de conteúdo

É o comando que a pessoa mais usa. Uma ideia entra, uma semana de conteúdo pronto sai. Ele
orquestra os outros comandos do módulo, então o resultado sai coeso (tudo gira no mesmo tema).

## Antes

Leia `cerebro/cerebro.md`. Em branco → `/instalar`. Pegue voz, pilares, público e CTA.

## Passo 1: A ideia da semana

- Peça UMA ideia/tema. Se ele não tiver, rode a lógica do `/ideias` e sugira 3 (dos pilares).
- Confirme o **ângulo** e pra quem fala. Uma semana inteira gira em torno desse tema, em formatos
  diferentes, não são 5 assuntos soltos.

## Passo 2: Montar o plano da semana

Proponha um plano enxuto antes de produzir, pra ele aprovar. Padrão sugerido:

```
Peça-mãe:  1 carrossel forte sobre o tema         → /carrossel
Derivados: 1 sequência de stories (bastidor/CTA)  → /stories
Amarração: legenda pra cada peça                  → /legenda
Reforço:   variações de título/gancho pra testar  → /titulo-gancho
```

Ajuste ao que ele topa produzir. Se ele quiser mais volume numa semana, gere um segundo
carrossel de outro ângulo do mesmo tema, sem sair da coesão.

## Passo 3: Produzir, peça por peça

Rode cada parte seguindo o SKILL correspondente (`/carrossel`, `/stories`, `/legenda`,
`/titulo-gancho`), **mantendo o mesmo tema e ângulo**, pra tudo conversar entre si.
Salve tudo numa pasta única: `conteudo/<AAAA-MM-DD>-<tema-curto>/`.

- Vá mostrando o que fica pronto, não despeje tudo de uma vez.
- O carrossel já sai com imagens renderizadas (ver `/carrossel`).

## Passo 4: Entregar a semana

Mostre um mapa do que foi criado e onde está, com uma sugestão simples de quando postar cada
coisa (ex: carrossel 2ª e 5ª, stories todo dia, legenda junto de cada post). Sem complicar.

## Princípios

1. **Uma ideia, muitos formatos.** Coesão é o valor: a semana toda fala do mesmo tema.
2. **Respeita o que a pessoa consegue fazer.** Não adianta plano lindo que ela não executa.
3. **Tudo com a cara do negócio.** Cada peça passa pelo Cérebro.
4. **Termina com clareza:** o que foi feito, onde está, e a ordem de postar.
