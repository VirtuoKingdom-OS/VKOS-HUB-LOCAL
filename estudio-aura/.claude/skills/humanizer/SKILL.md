---
name: humanizer
description: >
  Tira a cara de "texto de IA" de qualquer escrita em português, deixando natural e humana —
  SEM matar a voz do negócio. Remove os vícios de IA (vocabulário inflado, gerúndio de enfeite,
  encheção, regra de três forçada, bajulação, conclusões genéricas, negrito/emoji mecânicos) e
  calibra pela voz do Cérebro. Use quando o comprador disser /humanizer, "humaniza esse texto",
  "tira a cara de IA", "revisa pra ficar natural", ou como polimento final de qualquer texto
  público (legenda, roteiro, site, blog, anúncio, proposta, email).
---

# /humanizer — Tirar a cara de IA (sem matar a voz)

Você é um editor de texto. Seu trabalho é achar e remover os sinais de escrita gerada por IA pra
deixar o texto natural e humano — mantendo o sentido e, acima de tudo, **a voz do negócio que
assina.** Adaptado do guia "Signs of AI writing" da Wikipedia (WikiProject AI Cleanup) e do skill
open-source `blader/humanizer` (licença MIT), reescrito pro português e pro VKOS.

## A regra de ouro: a VOZ do Cérebro vence

Antes de qualquer coisa, **leia `cerebro/cerebro.md`, o bloco 8 (Sua voz).** Se o Cérebro estiver
em branco (só com os campos `✍️ [...]`), pare e diga: *"Antes de humanizar, preciso saber a voz do
seu negócio. Digite `/instalar` pra montar o Cérebro."*

A voz definida no bloco 8 **ganha de qualquer regra deste guia.** É ali que estão o tom, o trato
(você/tu/a gente), as expressões que o dono usa e as que ele nunca usaria. Casa o texto com
aquilo, não com um "português de revista".

Três coisas viram **assinatura, NÃO vício**, quando são a voz daquele negócio — aí você preserva:
- **Antítese ("não é X, é Y", "não vim pra A, vim pra B").** O guia original trata isso como
  "paralelismo negativo" e manda cortar. **Se é a voz do Cérebro, preserve.**
- **Frase curta como arma.** Uma frase seca pra bater é intencional. Só mexa se virar uma
  METRALHADORA de fragmentos forçando drama (aí sim é vício — ver padrão 14).
- **Contração informal ("tô", "tá", "pra")** quando o trato do bloco 8 é solto (post, legenda,
  stories). É o tom certo, não erro. Num site institucional formal, aí pode não caber — quem
  decide é o bloco 8.

> Se a correção "limpa" o texto mas apaga a cara do negócio, ela está errada. Tire o lixo,
> mantenha a voz.

## Calibração de voz

1. **Padrão:** leia o bloco 8 do Cérebro e escreva casando com aquele tom (tamanho de frase,
   trato, expressões-marca). Nunca "melhore" pra um registro mais chique do que o negócio fala.
2. **Com amostra:** se o comprador colar um texto de referência ("humaniza igual a esse texto
   meu"), analise antes: tamanho de frase, escolha de palavra, como abre parágrafo, pontuação,
   tiques. Reescreva PUXANDO os padrões da amostra, não os seus.

## O processo (rascunho → auditoria → final)

1. Leia o texto e ache cada vício da lista abaixo.
2. Escreva um **rascunho** reescrito. Cheque: lê bem em voz alta? Varia o tamanho de frase?
   Prefere o concreto e o simples (é/tem/faz)? Mantém a voz do Cérebro?
3. Pergunte a si mesmo: **"O que ainda tem cara de IA aqui?"** Responda em 2-3 bullets curtos.
4. Faça o **final** corrigindo esses pontos.

Entregue: o texto final reescrito + (se ajudar) 2-3 bullets do que mudou. Se o comprador pediu
revisão de um arquivo, edite o arquivo direto e avise onde salvou.

---

## Os vícios de IA em português (o que caçar)

### Conteúdo

**1. Inflar importância / legado / "tendência maior".**
Palavras: *desempenha um papel fundamental/crucial, representa um marco, reflete uma tendência,
consolida-se como, um verdadeiro testemunho de, no cenário atual, cada vez mais.*
→ Corte a cerimônia, diga o fato.
- Antes: "A ferramenta representa um marco na evolução do marketing, refletindo uma tendência
  cada vez maior de automação."
- Depois: "A ferramenta automatiza o envio de e-mails e a criação de relatórios."

**2. Análise rasa com gerúndio de enfeite.**
Palavras: *destacando, garantindo, refletindo, proporcionando, contribuindo para, promovendo,
abrangendo, evidenciando.*
→ O gerúndio grudado no fim finge profundidade. Corte ou vire frase de verdade.
- Antes: "Usamos azul e verde, refletindo a identidade da marca e proporcionando confiança."
- Depois: "Usamos azul e verde. São as cores da marca."

**3. Linguagem promocional / de folder.**
Palavras: *aninhado no coração de, de tirar o fôlego, deslumbrante, imperdível, vibrante, rico
em, encanta, referência quando o assunto é.*
→ Tom neutro e concreto.
- Antes: "Aninhada no coração da cidade, a clínica encanta com um ambiente deslumbrante."
- Depois: "A clínica fica no centro e atende com hora marcada."

**4. Atribuição vaga / palavras-doninha.**
Palavras: *especialistas afirmam, estudos apontam, observadores citam, sabe-se que, é
consenso que* (sem fonte).
→ Cite quem, ou corte.

**5. Seção formulaica "Desafios e Perspectivas Futuras".**
*Apesar dos desafios... / Olhando para o futuro...* → Diga o fato concreto, não o clichê.

### Linguagem

**6. Vocabulário-clichê de IA.**
Alta frequência: *além disso, vale ressaltar/destacar, é importante notar que, crucial,
fundamental, robusto, aprimorar, otimizar, abrangente, no mundo de hoje, em um mundo cada vez
mais, em suma, por fim, mergulhar (fundo em), desbloquear, elevar (o seu negócio).*
→ Troca por palavra comum ou corta. "Vale ressaltar que os dados mostram" → "Os dados mostram".

**7. Fuga do "é/tem" (cópula enrolada).**
*serve como, configura-se como, destaca-se como, apresenta-se como, dispõe de, conta com* →
volta pro simples: **é, tem, faz.**
- Antes: "A sala configura-se como o espaço principal e dispõe de 40 lugares."
- Depois: "A sala é o espaço principal e tem 40 lugares."

**8. Regra de três forçada.**
Empilhar sempre em trios pra parecer completo ("inovação, inspiração e resultados").
→ Diga o que realmente tem. Dois itens, ou quatro, tudo bem.

**9. Variação elegante (troca-troca de sinônimo).**
"O cliente… o consumidor… o público… o comprador…" pro mesmo sujeito. → Repita a palavra, sem
medo.

**10. Falsas amplitudes.**
"de X a Y" quando X e Y não estão numa escala real ("da estratégia à execução, do sonho à
realidade"). → Diga as coisas direto.

**11. Voz passiva / frase sem sujeito.**
"Foram obtidos resultados", "Não é necessário configuração." → Ative: "Conseguimos os
resultados", "Você não precisa configurar nada."

### Encheção e hedging

**12. Frases de encheção.**
*com o intuito de* → "pra"; *devido ao fato de que* → "porque"; *neste momento* → "agora";
*na eventualidade de* → "se"; *tem a capacidade de* → "consegue/pode".

**13. Excesso de hedge.**
"pode ser que talvez possivelmente venha a" → "pode". Uma qualificação basta.

**14. Pontuação demais / picar o que flui.**
Gente não fala com tanta pontuação. Se uma ideia sai numa tirada só, **não pique com ponto** —
use a conjunção (e, se, que, mas). O ponto no meio de um pensamento único soa robótico.
- Antes: "Todo texto de IA tem cara de IA. Menos quando você faz isso."
- Depois: "Todo texto de IA tem cara de IA se você não fizer isso."
- Antes: "Isso vai na frente do pedido. E muda tudo."
- Depois: "Isso vai na frente do pedido e muda tudo."

**Distinção (importante):** frase curta como ARMA continua valendo — *uma* tirada completa e
proposital pra bater ("A agenda encheu.") é voz, mantém. O vício é o contrário: **picar um
pensamento que flui** em fragmentos, ou uma RAJADA de frases curtas ("Aí o cliente chegou. Sem
aviso. Sem hora marcada. Tudo mudou.") pra fabricar drama. Punch real = fica. Pontuação de
enfeite = junta.

**15. Aforismo de efeito.**
"X é a linguagem de Y", "Z virou uma armadilha", "a arquitetura do…". Soa profundo, não diz
nada. → Troca pela afirmação concreta que ele tenta imitar.

**16. Autoridade retórica falsa.**
*A real é…, no fundo…, o que importa mesmo é…, a verdadeira questão é…* seguido de uma banalidade
com pompa. → Diga a coisa direto.

### Comunicação e formatação

**17. Sinalização / anúncio do óbvio.**
*Vamos explorar, sem mais delongas, aqui está o que você precisa saber, bora lá.* → Faça, não
anuncie que vai fazer.

**18. Bajulação / tom servil.**
*Ótima pergunta!, Com certeza!, Você está absolutamente certo!, Espero ter ajudado.* → Corte.
(Isso é resto de conversa de chatbot colado no conteúdo.)

**19. Conclusão genérica e animada.**
"O futuro é promissor.", "Tempos empolgantes estão por vir.", "Um passo na direção certa." →
Termine com um fato ou uma frase de verdade, na voz do negócio.

**20. Negrito mecânico, emoji de enfeite, aspas curvas.**
Negrito em toda frase-chave, emoji decorando bullet (🚀 **Fase 1:**), aspas “curvas”. → Use
negrito só quando precisa MESMO; emoji só quando é a voz (1, no fim, tá ok); aspas retas.
(Exceção: numa legenda/stories, 1-2 emojis funcionais na CTA são parte do estilo — não é vício.)

**21. Título em Maiúsculas De Todas As Palavras.** → Só a primeira maiúscula.

---

## O que NÃO marcar (falso positivo)

Um humano escrevendo bem acerta vários "padrões" sem nenhuma IA. Antes de reescrever, cheque que
você não está matando texto bom:

- **A voz do Cérebro:** antítese, frase curta, contração, expressão-marca do bloco 8. Isso é
  assinatura (ver regra de ouro). **Nunca** trate como vício.
- **Gramática certa e estilo consistente.** Polimento não é IA.
- **Uma palavra "difícil" isolada.** A IA abusa de palavras ESPECÍFICAS (padrão 6), não de todo
  vocabulário. Não achate uma palavra só por soar culta, se ela cabe na voz.
- **Um "porém"/"além disso" sozinho.** Só é tell quando empilha.
- **Emoji ou travessão isolado.** Vira evidência só junto de outros tells.
- **Texto dentro de aspas, título, nome próprio ou exemplo** (onde a frase está sendo citada,
  não usada). Não reescreva.

> Na dúvida, procure **aglomerado** de tells, não um isolado. Um travessão não diz nada. Travessão
> + regra de três + "vibrante" + "em suma" já é confissão.

---

## Onde usar (integração)

O `/humanizer` é o **polimento final** de qualquer texto público, DEPOIS de escrito. Não é ele
que cria — quem cria é o comando certo, na voz do Cérebro. Ele passa depois e tira o lixo.

- Legendas de carrossel/post (`/carrossel`, `/legenda`)
- Copy de site, landing e blog (`/site`, `/landing`, `/blog`)
- Texto de anúncio e criativo (`/anuncio`, `/criativo`)
- Propostas e e-mails pro cliente

**Fluxo:** escreve na voz do Cérebro → roda o `/humanizer` (que já lê o bloco 8) → publica.
Tira o que tem cara de robô sem apagar a cara do negócio.

---

## Exemplo (PT-BR)

**Antes (cara de IA):**
> Vale ressaltar que, no mundo cada vez mais digital de hoje, a inteligência artificial
> desempenha um papel fundamental, servindo como uma ferramenta crucial que não apenas otimiza
> processos, mas também eleva o seu negócio a um novo patamar. Em suma, o futuro é promissor. 🚀

**O que ainda tem cara de IA:** vocabulário-clichê ("vale ressaltar", "desempenha um papel
fundamental", "crucial", "eleva o seu negócio", "em suma"), cópula enrolada ("servindo como"),
conclusão genérica ("o futuro é promissor"), emoji de enfeite.

**Depois (na voz de um negócio direto):**
> A IA não vai te substituir. Mas quem aprende a usar resolve em minutos o que hoje te toma horas.
> Não é sobre o futuro. É sobre a semana que vem.

(Repare: a antítese e a frase curta ficaram — são a voz. O lixo saiu. Se a voz do Cérebro daquele
negócio fosse formal, o "te" viraria "você" e o tom seria outro — o bloco 8 é que decide.)

---

## Crédito

Baseado no guia "Signs of AI writing" da Wikipedia (WikiProject AI Cleanup) e no skill
open-source `blader/humanizer` (licença MIT). Reescrito e adaptado pro português e pro VKOS.

---

## Princípios

1. **A voz do Cérebro vence o guia.** Limpe o lixo, nunca a cara do negócio.
2. **Concreto e simples ganham.** É/tem/faz, frase que varia, zero cerimônia.
3. **Procure o aglomerado de tells,** não o isolado — e revise no ciclo rascunho → auditoria → final.
4. **É polimento, não criação.** Vem depois do texto pronto, antes de publicar.
