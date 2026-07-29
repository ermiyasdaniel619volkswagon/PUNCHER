@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "SERVER_DIR=%PROJECT_ROOT%\server"
set "LOG_DIR=%PROJECT_ROOT%\logs"
set "LOG_FILE=%LOG_DIR%\connector.log"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%NODE_EXE%" (
  echo [%date% %time%] ERROR: Node.js was not found at "%NODE_EXE%".>>"%LOG_FILE%"
  echo Install the 64-bit Node.js LTS MSI for all users.>>"%LOG_FILE%"
  exit /b 2
)

if not exist "%SERVER_DIR%\.env" (
  echo [%date% %time%] ERROR: "%SERVER_DIR%\.env" does not exist.>>"%LOG_FILE%"
  exit /b 3
)

cd /d "%SERVER_DIR%"
set "RUNTIME_ROLE=connector"
set "SYNC_MODE=direct"

:start
echo.>>"%LOG_FILE%"
echo ============================================================>>"%LOG_FILE%"
echo [%date% %time%] Starting PUNCHER Office Connector>>"%LOG_FILE%"
echo ============================================================>>"%LOG_FILE%"
"%NODE_EXE%" server.js >>"%LOG_FILE%" 2>&1
set "CONNECTOR_EXIT=%ERRORLEVEL%"
echo [%date% %time%] Connector exited with code %CONNECTOR_EXIT%.>>"%LOG_FILE%"

if "%CONNECTOR_EXIT%"=="0" exit /b 0
echo [%date% %time%] Restarting connector in 10 seconds.>>"%LOG_FILE%"
timeout /t 10 /nobreak >nul
goto start
