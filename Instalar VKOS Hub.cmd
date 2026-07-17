@echo off
chcp 65001 >nul
setlocal EnableExtensions DisableDelayedExpansion

set "RAIZ=%~dp0"
set "APP=%RAIZ%app"
set "VKOS=%RAIZ%VKOS"

echo.
echo ========================================
echo          Instalação do VKOS Hub
echo ========================================
echo.

call :GarantirNode
if errorlevel 1 exit /b 1

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo O npm não foi encontrado junto com o Node.js.
  echo Instale o Node.js LTS pelo site oficial e rode este arquivo de novo.
  call :AbrirNode
  call :PausarEmErro
  exit /b 1
)

if not exist "%APP%\package.json" (
  echo.
  echo Não encontrei os arquivos do VKOS Hub nesta pasta.
  echo Mantenha este arquivo ao lado da pasta app e tente de novo.
  call :PausarEmErro
  exit /b 1
)

if not exist "%VKOS%\package.json" (
  echo.
  echo Não encontrei o VKOS que acompanha o Hub.
  echo A pasta VKOS precisa ficar ao lado deste instalador.
  call :PausarEmErro
  exit /b 1
)

pushd "%APP%" >nul 2>&1
if errorlevel 1 (
  echo.
  echo Não consegui abrir a pasta do aplicativo.
  call :PausarEmErro
  exit /b 1
)

echo Instalando os componentes necessários.
echo Na primeira vez isso pode levar alguns minutos.
echo.
cmd.exe /D /C npm.cmd install
if errorlevel 1 (
  popd
  echo.
  echo A instalação dos componentes não terminou.
  echo Confira sua conexão com a internet e tente de novo.
  call :PausarEmErro
  exit /b 1
)

echo.
echo Preparando a interface do VKOS Hub...
cmd.exe /D /C npm.cmd run build -w web
if errorlevel 1 (
  popd
  echo.
  echo Não consegui preparar a interface do VKOS Hub.
  echo Rode este instalador de novo. Se o erro continuar, envie uma foto desta tela ao suporte.
  call :PausarEmErro
  exit /b 1
)
popd

pushd "%VKOS%" >nul 2>&1
if errorlevel 1 (
  echo.
  echo Não consegui abrir a pasta interna do VKOS.
  call :PausarEmErro
  exit /b 1
)

echo.
echo Preparando o motor visual do VKOS...
cmd.exe /D /C npm.cmd install
if errorlevel 1 (
  popd
  echo.
  echo Não consegui instalar os componentes do VKOS.
  echo Confira sua conexão com a internet e tente de novo.
  call :PausarEmErro
  exit /b 1
)

cmd.exe /D /C npx.cmd playwright install chromium
if errorlevel 1 (
  popd
  echo.
  echo Não consegui instalar o navegador usado para gerar imagens.
  echo Rode este instalador novamente.
  call :PausarEmErro
  exit /b 1
)
popd

echo.
echo Instalação concluída. Vou iniciar o VKOS Hub agora.
cmd.exe /D /C ""%RAIZ%Iniciar VKOS Hub.cmd""
if errorlevel 1 (
  echo.
  echo O VKOS Hub foi instalado, mas não conseguiu iniciar.
  echo Tente novamente pelo arquivo "Iniciar VKOS Hub.cmd".
  call :PausarEmErro
  exit /b 1
)
exit /b 0

:GarantirNode
call :ValidarNode
if not errorlevel 1 exit /b 0

echo O Node.js LTS ainda não está pronto nesta máquina.
echo Vou instalar o componente oficial automaticamente pelo Windows.
echo O Windows pode pedir sua autorização durante a instalação.
echo.

if /I "%VKOS_NAO_INSTALAR_AUTOMATICO%"=="1" goto :NodeManual

where winget >nul 2>&1
if errorlevel 1 goto :NodeManual

winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
if errorlevel 1 (
  echo.
  echo A instalação automática do Node.js não terminou.
  goto :NodeManual
)

rem O instalador do Node atualiza o PATH do Windows, mas esta janela já estava
rem aberta. Incluímos o local padrão agora para continuar sem reiniciar o PC.
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"

call :ValidarNode
if not errorlevel 1 (
  echo Node.js instalado e confirmado.
  exit /b 0
)

echo.
echo O Windows concluiu a instalação, mas esta janela ainda não encontrou o Node.js.
echo Feche este instalador e abra de novo. Não é necessário reiniciar o computador.
call :PausarEmErro
exit /b 1

:NodeManual
echo.
echo Não consegui instalar o Node.js automaticamente com o WinGet.
echo Vou abrir o download oficial. Instale a versão LTS e rode este arquivo de novo.
call :AbrirNode
call :PausarEmErro
exit /b 1

:ValidarNode
where node >nul 2>&1
if errorlevel 1 exit /b 1
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR exit /b 1
if %NODE_MAJOR% LSS 20 exit /b 1
echo Node.js confirmado: versão %NODE_MAJOR%.
exit /b 0

:AbrirNode
if /I not "%VKOS_NAO_ABRIR_NAVEGADOR%"=="1" start "" "https://nodejs.org/pt"
exit /b 0

:PausarEmErro
if /I not "%VKOS_SEM_PAUSA%"=="1" pause
exit /b 0
