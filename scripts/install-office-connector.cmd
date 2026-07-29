@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-office-connector.ps1"
exit /b %ERRORLEVEL%
