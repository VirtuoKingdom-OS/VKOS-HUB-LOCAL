$ErrorActionPreference = "Stop"

$raizRuntime = Join-Path $PSScriptRoot "..\runtime"
$raizRuntime = [System.IO.Path]::GetFullPath($raizRuntime)
$pastaSegredos = Join-Path $raizRuntime "secrets"

New-Item -ItemType Directory -Force -Path $pastaSegredos | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raizRuntime "dados\clientes") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raizRuntime "dados\core") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raizRuntime "dados\hub") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raizRuntime "backups") | Out-Null

function Novo-SegredoBase64([int]$bytes) {
  $buffer = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer)
}

function Novo-SegredoHex([int]$bytes) {
  $buffer = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToHexString($buffer).ToLowerInvariant()
}

$senhaPostgres = Novo-SegredoHex 32
Set-Content -NoNewline -Encoding ascii -LiteralPath (Join-Path $pastaSegredos "postgres_password") -Value $senhaPostgres
Set-Content -NoNewline -Encoding ascii -LiteralPath (Join-Path $pastaSegredos "database_url") -Value "postgresql://vkos:$senhaPostgres@postgres:5432/vkos"
Set-Content -NoNewline -Encoding ascii -LiteralPath (Join-Path $pastaSegredos "cofre_master_key") -Value (Novo-SegredoBase64 32)
Set-Content -NoNewline -Encoding ascii -LiteralPath (Join-Path $pastaSegredos "motor_internal_token") -Value (Novo-SegredoBase64 48)
Set-Content -NoNewline -Encoding ascii -LiteralPath (Join-Path $pastaSegredos "backup_key") -Value (Novo-SegredoBase64 48)

foreach ($arquivo in @("vertex_credentials.json", "backup_credentials.json")) {
  $caminho = Join-Path $pastaSegredos $arquivo
  if (-not (Test-Path -LiteralPath $caminho)) { Set-Content -Encoding ascii -LiteralPath $caminho -Value "{}" }
}

Write-Host "Runtime criado em $raizRuntime"
Write-Host "Antes do deploy, preencha as credenciais separadas de Vertex e backup ou carregue-as pelo Secret Manager."
