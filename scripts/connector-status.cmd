@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
set "LOG_FILE=%PROJECT_ROOT%\logs\connector.log"

echo.
echo ============================================================
echo PUNCHER OFFICE CONNECTOR STATUS
echo ============================================================
schtasks /Query /TN "PUNCHER Office Connector" /V /FO LIST
echo.
echo -------------------- RECENT CONNECTOR LOG ------------------
if exist "%LOG_FILE%" (
  powershell.exe -NoProfile -Command "Get-Content -LiteralPath '%LOG_FILE%' -Tail 40"
) else (
  echo No connector log exists yet at:
  echo %LOG_FILE%
)
echo ============================================================
