CREATE TABLE IF NOT EXISTS credenciais_sistema (
  tipo text PRIMARY KEY,
  valor_cifrado text NOT NULL,
  mascara text NOT NULL,
  teste_json jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
