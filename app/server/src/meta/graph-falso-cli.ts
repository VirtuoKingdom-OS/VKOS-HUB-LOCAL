import { iniciarGraphFalso } from "./graph-falso.js";

const porta = Number(process.env.META_GRAPH_FALSO_PORT ?? 4699);
if (!Number.isInteger(porta) || porta < 1 || porta > 65_535) {
  throw new Error("META_GRAPH_FALSO_PORT invalida.");
}

const falso = await iniciarGraphFalso(porta);
console.log(`Graph falso pronto em ${falso.base}`);

const encerrar = async () => {
  await falso.fechar();
  process.exit(0);
};

process.on("SIGINT", () => void encerrar());
process.on("SIGTERM", () => void encerrar());
