DELETE FROM credenciais
WHERE tipo = 'gemini';

ALTER TABLE credenciais
  DROP CONSTRAINT IF EXISTS credenciais_tipo_check;

ALTER TABLE credenciais
  ADD CONSTRAINT credenciais_tipo_check
  CHECK (tipo IN ('claude_team', 'conexao_externa'));

ALTER TABLE credenciais
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'nao_testada',
  ADD COLUMN IF NOT EXISTS testada_em timestamptz,
  ADD COLUMN IF NOT EXISTS erro_codigo text;

ALTER TABLE credenciais
  DROP CONSTRAINT IF EXISTS credenciais_status_check;

ALTER TABLE credenciais
  ADD CONSTRAINT credenciais_status_check
  CHECK (status IN ('nao_testada', 'valida', 'invalida'));

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS motor_estado text NOT NULL DEFAULT 'nao_testado',
  ADD COLUMN IF NOT EXISTS motor_testado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motor_erro_codigo text;

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_motor_estado_check;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_motor_estado_check
  CHECK (motor_estado IN ('nao_testado', 'operante', 'manutencao'));
