import assert from "node:assert/strict";
import test from "node:test";

import type { DiaDeGasto } from "../../tipos/core";
import {
  alturaDaBarra,
  dicaDoGasto,
  encurtarCaminho,
  formatarUsd,
  fraseDaTendencia,
  fraseDoPiso,
  fraseDosRemovidos,
  lerSerie,
  pastaPrevista,
  tempoRelativo,
} from "./logica";

function dia(usd: number, turnos = usd > 0 ? 1 : 0): DiaDeGasto {
  return { dia: "2026-07-20", usd, turnos, turnosSemCusto: 0 };
}

test("todo valor em dolar sai marcado como estimado", () => {
  // Com assinatura, nenhum dolar e cobranca real. Numero sem o "~" mentiria
  // sobre a precisao que ele tem.
  assert.equal(formatarUsd(12.5, { estimado: true }), "~$12.50");
  assert.equal(formatarUsd(0, { estimado: true }), "~$0.00");
});

test("total com turno sem preco aparece como piso, nunca como exato", () => {
  assert.equal(formatarUsd(12.5, { estimado: true, piso: true }), "≥ ~$12.50");
  assert.equal(formatarUsd(3, { piso: true }), "≥ $3.00");
});

test("valor invalido nao vira NaN na tela", () => {
  assert.equal(formatarUsd(Number.NaN, { estimado: true }), "~$0.00");
  assert.equal(formatarUsd(Number.POSITIVE_INFINITY), "$0.00");
});

test("a frase do piso diz quantos turnos gastaram sem preco", () => {
  assert.equal(
    fraseDoPiso({ piso: true, turnosSemCusto: 1, workspacesSemHistorico: 0 }),
    "1 turno gastou sem preço conhecido. O valor real é maior.",
  );
  assert.equal(
    fraseDoPiso({ piso: true, turnosSemCusto: 4, workspacesSemHistorico: 0 }),
    "4 turnos gastaram sem preço conhecido. O valor real é maior.",
  );
});

test("workspace removido sem historico legivel tambem vira ressalva", () => {
  assert.equal(
    fraseDoPiso({ piso: true, turnosSemCusto: 2, workspacesSemHistorico: 1 }),
    "2 turnos gastaram sem preço conhecido e 1 workspace foi removido sem histórico legível. O valor real é maior.",
  );
});

test("piso sem motivo nomeado continua declarado como piso", () => {
  // Nunca cair no silencio: se a tela nao sabe o motivo, ela ainda tem que
  // dizer que o numero e um piso.
  const frase = fraseDoPiso({ piso: true, turnosSemCusto: 0, workspacesSemHistorico: 0 });
  assert.match(String(frase), /valor real é maior/);
});

test("sem piso nao ha ressalva nenhuma", () => {
  assert.equal(fraseDoPiso({ piso: false, turnosSemCusto: 0, workspacesSemHistorico: 0 }), null);
});

test("o total diz quanto veio de workspace ja removido", () => {
  // Dinheiro gasto nao deixa de ter sido gasto porque a pasta sumiu. Sem esta
  // frase o total parece nao bater com a soma da lista.
  assert.equal(
    fraseDosRemovidos({ usdDeRemovidos: 10, workspacesRemovidos: 2, estimado: true }),
    "Inclui ~$10.00 de 2 workspaces já removidos.",
  );
  assert.equal(
    fraseDosRemovidos({ usdDeRemovidos: 4.5, workspacesRemovidos: 1, estimado: true }),
    "Inclui ~$4.50 de 1 workspace já removido.",
  );
  assert.equal(
    fraseDosRemovidos({ usdDeRemovidos: 0, workspacesRemovidos: 0, estimado: true }),
    null,
  );
});

test("a dica do gasto junta total, piso e procedencia numa frase so", () => {
  const dica = dicaDoGasto({
    totalUsd: 20,
    estimado: true,
    piso: true,
    turnosSemCusto: 3,
    usdDeRemovidos: 5,
    workspacesRemovidos: 1,
    workspacesSemHistorico: 0,
    porDia: [],
  });
  assert.match(dica, /≥ ~\$20\.00/);
  assert.match(dica, /3 turnos/);
  assert.match(dica, /1 workspace já removido/);
});

test("a serie compara a metade nova com a metade velha", () => {
  const porDia = [...Array(7)].map(() => dia(1)).concat([...Array(7)].map(() => dia(2)));
  const leitura = lerSerie(porDia);
  assert.equal(leitura.anterior, 7);
  assert.equal(leitura.recente, 14);
  assert.equal(leitura.direcao, "subiu");
  assert.equal(Math.round(leitura.variacao ?? 0), 100);
  assert.equal(leitura.maximo, 2);
  assert.equal(leitura.vazia, false);
});

test("variacao pequena conta como mesmo ritmo, nao como alta", () => {
  const porDia = [...Array(7)].map(() => dia(10)).concat([...Array(7)].map(() => dia(10.2)));
  assert.equal(lerSerie(porDia).direcao, "igual");
});

test("metade velha zerada nao vira porcentagem inventada", () => {
  // Dividir por zero daria um numero enorme e sem sentido nenhum.
  const porDia = [...Array(7)].map(() => dia(0)).concat([...Array(7)].map(() => dia(3)));
  const leitura = lerSerie(porDia);
  assert.equal(leitura.direcao, "sem-base");
  assert.equal(leitura.variacao, null);
});

test("serie sem turno nenhum se declara vazia", () => {
  const leitura = lerSerie([...Array(14)].map(() => dia(0)));
  assert.equal(leitura.vazia, true);
  assert.match(fraseDaTendencia(leitura, 14), /Nenhum turno de IA nos últimos 14 dias/);
});

test("a frase da tendencia diz a direcao e a porcentagem", () => {
  const porDia = [...Array(7)].map(() => dia(1)).concat([...Array(7)].map(() => dia(2)));
  assert.match(fraseDaTendencia(lerSerie(porDia), 14), /Subiu 100%/);
  const caindo = [...Array(7)].map(() => dia(4)).concat([...Array(7)].map(() => dia(1)));
  assert.match(fraseDaTendencia(lerSerie(caindo), 14), /Caiu 75%/);
});

test("a barra so enche em relacao ao maior dia, e some no periodo vazio", () => {
  assert.equal(alturaDaBarra(dia(5), 10), 50);
  assert.equal(alturaDaBarra(dia(10), 10), 100);
  assert.equal(alturaDaBarra(dia(0), 10), 0);
  // Periodo inteiro sem gasto: barra cheia ali seria mentira visual.
  assert.equal(alturaDaBarra(dia(0), 0), 0);
  // Dia minusculo nao pode desaparecer e parecer dia vazio.
  assert.equal(alturaDaBarra(dia(0.001), 100), 4);
});

test("o tempo relativo nao inventa idade pra data ausente ou quebrada", () => {
  const agora = new Date("2026-07-27T12:00:00.000Z");
  assert.equal(tempoRelativo(null, agora), null);
  assert.equal(tempoRelativo("", agora), null);
  assert.equal(tempoRelativo("nao e data", agora), null);
  assert.equal(tempoRelativo("2026-07-27T11:59:40.000Z", agora), "agora");
  assert.equal(tempoRelativo("2026-07-27T11:30:00.000Z", agora), "há 30 min");
  assert.equal(tempoRelativo("2026-07-27T09:00:00.000Z", agora), "há 3 horas");
  assert.equal(tempoRelativo("2026-07-26T12:00:00.000Z", agora), "ontem");
  assert.equal(tempoRelativo("2026-07-20T12:00:00.000Z", agora), "há 7 dias");
  assert.equal(tempoRelativo("2026-05-27T12:00:00.000Z", agora), "há 2 meses");
});

test("caminho longo aparece encurtado, e curto aparece inteiro", () => {
  assert.equal(encurtarCaminho("E:/VKOS/clientes/aura"), "... / clientes / aura");
  assert.equal(encurtarCaminho("C:/aura"), "C: / aura");
});

test("a pasta prevista repete a regra de slug do servidor, sempre em relativo", () => {
  // Mesmos casos de server/src/workspaces/pastas.ts. Se as duas regras se
  // separarem, a tela passa a anunciar uma pasta que nao e a que nasce.
  assert.equal(pastaPrevista("Mãe Pixel"), "workspaces/mae-pixel");
  assert.equal(pastaPrevista("  Aura & Co.  "), "workspaces/aura-co");
  assert.equal(pastaPrevista("Ação 2026"), "workspaces/acao-2026");
  // So simbolo: o servidor cai no fallback "workspace", e o anuncio acompanha.
  assert.equal(pastaPrevista("***"), "workspaces/workspace");
  // Antes de digitar nao ha o que prever, e o fallback pareceria nome decidido.
  assert.equal(pastaPrevista(""), "workspaces/");
  assert.equal(pastaPrevista("   "), "workspaces/");
});
