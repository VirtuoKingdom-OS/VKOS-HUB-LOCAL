ALTER TABLE convites
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE convites
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE convites
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_convites_id
  ON convites (id);

ALTER TABLE modelos_workspace
  ALTER COLUMN motor_padrao SET DEFAULT 'gemini';

ALTER TABLE workspaces
  ALTER COLUMN motor SET DEFAULT 'gemini';

UPDATE modelos_workspace
SET motor_padrao = 'gemini'
WHERE motor_padrao = 'nenhum';

UPDATE workspaces
SET
  motor = 'gemini',
  motor_estado = 'nao_testado',
  motor_testado_em = NULL,
  motor_erro_codigo = NULL
WHERE motor = 'nenhum';
