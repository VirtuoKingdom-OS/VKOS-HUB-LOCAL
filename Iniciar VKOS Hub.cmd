@echo off
chcp 65001 >nul
setlocal EnableExtensions DisableDelayedExpansion

set "RAIZ=%~dp0"
set "APP=%RAIZ%app"
set "VKOS=%RAIZ%VKOS"
set "PORTA=%VKOS_PORT%"
if not defined PORTA set "PORTA=4600"
set "URL=http://localhost:%PORTA%"

call :ValidarNode
if errorlevel 1 exit /b 1

if not exist "%APP%\package.json" (
  echo.
  echo Não encontrei os arquivos do VKOS Hub nesta pasta.
  echo Mantenha este arquivo ao lado da pasta app e tente de novo.
  call :PausarEmErro
  exit /b 1
)

if not exist "%VKOS%\cerebro\cerebro.md" (
  call :OrientarInstalacao "A pasta interna do VKOS está ausente ou incompleta."
  exit /b 1
)

if not exist "%VKOS%\.claude\skills\" (
  call :OrientarInstalacao "As funções internas do VKOS estão ausentes."
  exit /b 1
)

if not exist "%VKOS%\node_modules\playwright\" (
  call :OrientarInstalacao "Os componentes visuais do VKOS ainda não estão instalados."
  exit /b 1
)

if not exist "%APP%\node_modules\" (
  call :OrientarInstalacao "As dependências do VKOS Hub ainda não estão instaladas."
  exit /b 1
)

if not exist "%APP%\node_modules\.bin\tsx.cmd" (
  call :OrientarInstalacao "A instalação das dependências está incompleta."
  exit /b 1
)

if not exist "%APP%\web\dist\index.html" (
  call :OrientarInstalacao "O VKOS Hub ainda não foi compilado."
  exit /b 1
)

call :VerificarHub
set "ESTADO_HUB=%ERRORLEVEL%"
if "%ESTADO_HUB%"=="0" goto :AbrirHub
if "%ESTADO_HUB%"=="2" goto :PortaOcupada

echo.
echo Iniciando o VKOS Hub. Aguarde alguns segundos...
start "VKOS Hub" /min /D "%APP%" cmd.exe /D /C "npm start"
if errorlevel 1 (
  echo.
  echo Não consegui iniciar o servidor do VKOS Hub.
  echo Rode "Instalar VKOS Hub.cmd" para reparar a instalação.
  call :PausarEmErro
  exit /b 1
)

set /a TENTATIVA=0
:AguardarHub
set /a TENTATIVA+=1
call :VerificarHub
set "ESTADO_HUB=%ERRORLEVEL%"
if "%ESTADO_HUB%"=="0" goto :AbrirHub
if "%ESTADO_HUB%"=="2" goto :PortaOcupada
if %TENTATIVA% GEQ 30 goto :TempoEsgotado
ping 127.0.0.1 -n 2 >nul
goto :AguardarHub

:AbrirHub
echo.
echo VKOS Hub pronto em %URL%
if /I not "%VKOS_NAO_ABRIR_NAVEGADOR%"=="1" start "" "%URL%"
exit /b 0

:PortaOcupada
echo.
echo A porta %PORTA% respondeu, mas não é o VKOS Hub.
echo Outro programa está usando essa porta. Feche esse programa e tente de novo.
echo O VKOS Hub não foi aberto para evitar mostrar o serviço errado.
call :PausarEmErro
exit /b 2

:TempoEsgotado
echo.
echo O VKOS Hub não respondeu em %URL% após 30 segundos.
echo A janela minimizada do servidor pode mostrar o motivo do erro.
echo Rode "Instalar VKOS Hub.cmd" se a instalação estiver incompleta.
call :PausarEmErro
exit /b 1

:ValidarNode
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo O Node.js não está instalado ou não foi encontrado.
  echo Rode "Instalar VKOS Hub.cmd" para receber as orientações.
  call :PausarEmErro
  exit /b 1
)
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo.
  echo Não consegui confirmar a versão do Node.js.
  echo Rode "Instalar VKOS Hub.cmd" para reparar a instalação.
  call :PausarEmErro
  exit /b 1
)
if %NODE_MAJOR% LSS 20 (
  echo.
  echo Seu Node.js é antigo. O VKOS Hub precisa do Node.js 20 ou mais recente.
  echo Rode "Instalar VKOS Hub.cmd" para receber as orientações.
  call :PausarEmErro
  exit /b 1
)
exit /b 0

:VerificarHub
node -e "const http=require('http');let acabou=false;const fim=c=>{if(!acabou){acabou=true;process.exit(c)}};const req=http.get({hostname:'127.0.0.1',port:Number(process.argv[1]),path:'/api/ambiente',timeout:1500},res=>{let corpo='';res.setEncoding('utf8');res.on('data',p=>corpo+=p);res.on('end',()=>{try{const d=JSON.parse(corpo);const claude=d.claude;const shape=res.statusCode===200&&typeof d.plataforma==='string'&&typeof d.node==='string'&&claude&&typeof claude==='object'&&typeof claude.instalado==='boolean'&&'versao' in claude;fim(shape?0:2)}catch{fim(2)}})});req.on('timeout',()=>req.destroy());req.on('error',()=>fim(1));" "%PORTA%" >nul 2>&1
exit /b %ERRORLEVEL%

:OrientarInstalacao
echo.
echo %~1
echo Dê dois cliques em "Instalar VKOS Hub.cmd" e tente novamente.
call :PausarEmErro
exit /b 0

:PausarEmErro
if /I not "%VKOS_SEM_PAUSA%"=="1" pause
exit /b 0
