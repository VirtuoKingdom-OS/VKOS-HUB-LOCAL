import assert from "node:assert/strict";
import test from "node:test";

import { nomeUnicoSiteNetlify } from "./netlify.js";

test("gera nome Netlify unico, valido e limitado", () => {
  const nome = nomeUnicoSiteNetlify(
    "2026-07-15-Site Ferramentas de IA com um titulo muito longo e acentos",
    "4b800213-38b2-4cfd-b129-1dd73462b9a4",
  );
  assert.match(nome, /^vkos-[a-z0-9-]+-4b800213$/);
  assert.ok(nome.length <= 63);
  assert.equal(nome, nomeUnicoSiteNetlify(
    "2026-07-15-Site Ferramentas de IA com um titulo muito longo e acentos",
    "4b800213-38b2-4cfd-b129-1dd73462b9a4",
  ));
});
