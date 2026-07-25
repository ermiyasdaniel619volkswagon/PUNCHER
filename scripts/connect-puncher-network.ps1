[CmdletBinding()]
param(
    [string]$InterfaceAlias = "Wi-Fi",
    [string]$ComputerSecondaryIp = "192.168.100.10",
    [string]$DeviceIp = "192.168.100.43",
    [int]$DevicePort = 80
)

$ErrorActionPreference = "Stop"

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdministrator = $currentPrincipal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdministrator) {
    Write-Host "Administrator permission is required to add a secondary IP address." -ForegroundColor Yellow
    Write-Host "Approve the Windows User Account Control prompt to continue."

    $elevatedArguments = @(
        "-NoProfile"
        "-ExecutionPolicy"
        "Bypass"
        "-File"
        "`"$PSCommandPath`""
        "-InterfaceAlias"
        "`"$InterfaceAlias`""
        "-ComputerSecondaryIp"
        "`"$ComputerSecondaryIp`""
        "-DeviceIp"
        "`"$DeviceIp`""
        "-DevicePort"
        "$DevicePort"
    )

    try {
        $process = Start-Process `
            -FilePath "powershell.exe" `
            -Verb RunAs `
            -ArgumentList $elevatedArguments `
            -Wait `
            -PassThru
        exit $process.ExitCode
    } catch {
        Write-Error "Elevation was cancelled or unavailable. Right-click PowerShell, choose 'Run as administrator', and run the command again."
        exit 1
    }
}

Write-Host "PUNCHER network bridge setup" -ForegroundColor Cyan
Write-Host "This keeps the current Wi-Fi address and adds $ComputerSecondaryIp/24."

$adapter = Get-NetAdapter -Name $InterfaceAlias -ErrorAction Stop
if ($adapter.Status -ne "Up") {
    throw "Adapter '$InterfaceAlias' is not connected. Connect it to the same Wi-Fi/LAN as the terminal first."
}

$existingSecondary = Get-NetIPAddress `
    -InterfaceAlias $InterfaceAlias `
    -AddressFamily IPv4 `
    -IPAddress $ComputerSecondaryIp `
    -ErrorAction SilentlyContinue

if (-not $existingSecondary) {
    Write-Host "Checking that $ComputerSecondaryIp is unused..."
    $conflict = Test-Connection -ComputerName $ComputerSecondaryIp -Count 1 -Quiet
    if ($conflict) {
        throw "$ComputerSecondaryIp already answers on the network. Choose another unused 192.168.100.x address."
    }

    New-NetIPAddress `
        -InterfaceAlias $InterfaceAlias `
        -IPAddress $ComputerSecondaryIp `
        -PrefixLength 24 `
        -AddressFamily IPv4 `
        -Type Unicast | Out-Null

    Write-Host "Added $ComputerSecondaryIp/24 to '$InterfaceAlias'." -ForegroundColor Green
} else {
    Write-Host "$ComputerSecondaryIp/24 is already configured." -ForegroundColor Yellow
}

Write-Host "Testing terminal $DeviceIp on TCP port $DevicePort..."
$test = Test-NetConnection `
    -ComputerName $DeviceIp `
    -Port $DevicePort `
    -InformationLevel Detailed `
    -WarningAction SilentlyContinue

if ($test.TcpTestSucceeded) {
    Write-Host "SUCCESS: The terminal HTTP port is reachable." -ForegroundColor Green
    Write-Host "Restart PUNCHER with 'npm run dev', then open http://localhost:5000/api/health"
} else {
    Write-Host "The terminal is still unreachable." -ForegroundColor Red
    Write-Host ""
    Write-Host "The secondary address is valid, but one of these remains true:"
    Write-Host "  1. The terminal is not physically connected to this Wi-Fi/LAN."
    Write-Host "  2. Wi-Fi client/AP isolation blocks devices from reaching each other."
    Write-Host "  3. The terminal IP or HTTP port is different."
    Write-Host "  4. Its HTTP service is disabled."
    Write-Host ""
    Write-Host "To remove the secondary address:"
    Write-Host "Remove-NetIPAddress -InterfaceAlias '$InterfaceAlias' -IPAddress '$ComputerSecondaryIp' -Confirm:`$false"
}
