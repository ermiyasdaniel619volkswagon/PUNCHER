@echo off
setlocal

net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
  echo Administrator permission is required.
  echo Right-click CMD, choose "Run as administrator", and run this script again.
  exit /b 1
)

schtasks /End /TN "PUNCHER Office Connector" >nul 2>&1
schtasks /Delete /TN "PUNCHER Office Connector" /F

if "%ERRORLEVEL%"=="0" (
  echo PUNCHER Office Connector automatic startup was removed.
  echo Project files, environment settings, logs, and Atlas data were not deleted.
) else (
  echo The scheduled task was not found or could not be removed.
  exit /b 1
)
