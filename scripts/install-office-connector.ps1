[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$taskName = "PUNCHER Office Connector"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runScript = Join-Path $PSScriptRoot "run-office-connector.cmd"
$envFile = Join-Path $projectRoot "server\.env"
$serverFile = Join-Path $projectRoot "server\server.js"
$nodeExe = "C:\Program Files\nodejs\node.exe"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Administrator permission is required. Approve the Windows prompt." -ForegroundColor Yellow
    $process = Start-Process `
        -FilePath "powershell.exe" `
        -Verb RunAs `
        -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", "`"$PSCommandPath`""
        ) `
        -Wait `
        -PassThru
    exit $process.ExitCode
}

Write-Host ""
Write-Host "PUNCHER OFFICE CONNECTOR INSTALLER" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host ""

$checks = @(
    @{ Name = "Node.js"; Path = $nodeExe },
    @{ Name = "Server"; Path = $serverFile },
    @{ Name = "Environment"; Path = $envFile },
    @{ Name = "Runner"; Path = $runScript }
)

foreach ($check in $checks) {
    if (-not (Test-Path -LiteralPath $check.Path)) {
        Write-Host "[FAIL] $($check.Name): $($check.Path)" -ForegroundColor Red
        if ($check.Name -eq "Node.js") {
            Write-Host "Install the 64-bit Node.js LTS MSI for all users, then run this installer again."
        }
        exit 1
    }
    Write-Host "[PASS] $($check.Name)" -ForegroundColor Green
}

$settings = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $settings[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$requiredKeys = @(
    "MONGODB_URI", "DEVICE_IP", "DEVICE_PORT", "API_USER", "API_PASS"
)
foreach ($key in $requiredKeys) {
    if (-not $settings[$key] -or $settings[$key] -match "replace|YOUR_") {
        Write-Host "[FAIL] server\.env is missing a production value for $key." -ForegroundColor Red
        exit 1
    }
}
Write-Host "[PASS] Required connector configuration" -ForegroundColor Green

$logsDirectory = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Path $logsDirectory -Force | Out-Null
Write-Host "[PASS] Logs directory" -ForegroundColor Green

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/d /c `"`"$runScript`"`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

$task = New-ScheduledTask `
    -Action $action `
    -Trigger $trigger `
    -Principal $taskPrincipal `
    -Settings $taskSettings `
    -Description "Synchronizes the office Hikvision attendance terminal with MongoDB Atlas."

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host "PUNCHER Office Connector installed and started successfully." -ForegroundColor Green
Write-Host "Task name : $taskName"
Write-Host "Log file  : $(Join-Path $logsDirectory 'connector.log')"
Write-Host ""
Write-Host "Run scripts\connector-status.cmd to verify synchronization."
