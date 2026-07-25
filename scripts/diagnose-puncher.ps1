[CmdletBinding()]
param(
    [string]$EnvFile = ""
)

$ErrorActionPreference = "SilentlyContinue"

if (-not $EnvFile) {
    $EnvFile = Join-Path $PSScriptRoot "..\server\.env"
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("-" * 72) -ForegroundColor DarkGray
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host ("-" * 72) -ForegroundColor DarkGray
}

function Write-Result([string]$Label, [bool]$Success, [string]$Detail) {
    $state = if ($Success) { "PASS" } else { "FAIL" }
    $color = if ($Success) { "Green" } else { "Red" }
    Write-Host ("[{0}] " -f $state) -ForegroundColor $color -NoNewline
    Write-Host ("{0}: {1}" -f $Label, $Detail)
}

function Test-TcpPort([string]$HostName, [int]$Port, [int]$TimeoutMs = 1500) {
    $client = New-Object System.Net.Sockets.TcpClient
    $started = [Diagnostics.Stopwatch]::StartNew()
    try {
        $task = $client.ConnectAsync($HostName, $Port)
        if (-not $task.Wait($TimeoutMs)) {
            return [pscustomobject]@{
                Success = $false
                Code = "ETIMEDOUT"
                LatencyMs = $started.ElapsedMilliseconds
            }
        }
        return [pscustomobject]@{
            Success = $client.Connected
            Code = if ($client.Connected) { "OPEN" } else { "CLOSED" }
            LatencyMs = $started.ElapsedMilliseconds
        }
    } catch {
        $socketError = $_.Exception.InnerException.SocketErrorCode
        return [pscustomobject]@{
            Success = $false
            Code = if ($socketError) { "$socketError" } else { "ERROR" }
            LatencyMs = $started.ElapsedMilliseconds
        }
    } finally {
        $client.Dispose()
        $started.Stop()
    }
}

function Get-NetworkPrefix([string]$IpAddress, [int]$PrefixLength) {
    if ($PrefixLength -ne 24) {
        return $null
    }
    return ($IpAddress -split "\.")[0..2] -join "."
}

Clear-Host
Write-Host " PUNCHER NETWORK DOCTOR " -ForegroundColor Black -BackgroundColor Cyan
Write-Host " Read-only device connectivity diagnosis - credentials are never printed"
Write-Host " Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Section "1. Application configuration"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Result "Environment file" $false "Not found at $EnvFile"
    exit 1
}

$settings = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $settings[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$deviceIp = $settings["DEVICE_IP"]
$protocol = if ($settings["DEVICE_PROTOCOL"]) { $settings["DEVICE_PROTOCOL"] } else { "http" }
$devicePort = if ($settings["DEVICE_PORT"]) {
    [int]$settings["DEVICE_PORT"]
} elseif ($protocol -eq "https") {
    443
} else {
    80
}

Write-Result "Environment file" $true $EnvFile
Write-Host "Target             : ${protocol}://${deviceIp}:${devicePort}"
Write-Host "MongoDB            : $($settings['MONGODB_URI'])"
Write-Host "API user           : $($settings['API_USER'])"
Write-Host "API password       : configured (hidden)"

if (-not [Net.IPAddress]::TryParse($deviceIp, [ref]([Net.IPAddress]$null))) {
    Write-Result "DEVICE_IP" $false "'$deviceIp' is not a valid IP address"
    exit 1
}

Write-Section "2. Active computer network"

$activeAddresses = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.AddressState -eq "Preferred"
    }

if (-not $activeAddresses) {
    $activeAddresses = [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object {
            $_.OperationalStatus -eq
            [Net.NetworkInformation.OperationalStatus]::Up
        } |
        ForEach-Object {
            $networkInterface = $_
            $_.GetIPProperties().UnicastAddresses |
                Where-Object {
                    $_.Address.AddressFamily -eq
                    [Net.Sockets.AddressFamily]::InterNetwork -and
                    $_.Address.IPAddressToString -notlike "127.*"
                } |
                ForEach-Object {
                    [pscustomobject]@{
                        InterfaceAlias = $networkInterface.Name
                        IPAddress = $_.Address.IPAddressToString
                        PrefixLength = $_.PrefixLength
                    }
                }
        }
}

if (-not $activeAddresses) {
    Write-Result "Network adapters" $false "No active IPv4 address was found"
    exit 1
}

foreach ($address in $activeAddresses) {
    Write-Host ("{0,-20} {1}/{2}" -f $address.InterfaceAlias, $address.IPAddress, $address.PrefixLength)
}

$defaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" |
    Sort-Object RouteMetric |
    Select-Object -First 1
if ($defaultRoute) {
    Write-Host "Default gateway     : $($defaultRoute.NextHop) via interface $($defaultRoute.InterfaceIndex)"
}

$sameSubnetAddress = $activeAddresses | Where-Object {
    (Get-NetworkPrefix $_.IPAddress $_.PrefixLength) -eq
    (Get-NetworkPrefix $deviceIp 24)
} | Select-Object -First 1

if ($sameSubnetAddress) {
    Write-Result "Subnet comparison" $true "$($sameSubnetAddress.IPAddress) can address $deviceIp directly"
} else {
    $computerIps = ($activeAddresses.IPAddress -join ", ")
    Write-Result "Subnet comparison" $false "PC [$computerIps] and device [$deviceIp] are on different local subnets"
}

Write-Section "3. Route and neighbor checks"

$route = Find-NetRoute -RemoteIPAddress $deviceIp
if ($route) {
    Write-Host "Selected interface  : $($route.InterfaceAlias)"
    Write-Host "Selected source IP  : $($route.IPAddress)"
    Write-Host "Selected next hop   : $($route.NextHop)"
}

$ping = Test-Connection -ComputerName $deviceIp -Count 1 -Quiet
Write-Result "ICMP ping" $ping $(if ($ping) { "Device replied" } else { "No reply (some devices block ping)" })

$neighbor = Get-NetNeighbor -AddressFamily IPv4 |
    Where-Object IPAddress -eq $deviceIp |
    Select-Object -First 1
if ($neighbor -and $neighbor.State -notin @("Unreachable", "Incomplete")) {
    Write-Result "ARP/neighbor" $true "$($neighbor.LinkLayerAddress), state $($neighbor.State)"
} else {
    Write-Result "ARP/neighbor" $false "No reachable local neighbor entry"
}

Write-Section "4. Hikvision service ports"

$ports = @($devicePort, 80, 443, 8000) | Select-Object -Unique
$portResults = @{}
foreach ($port in $ports) {
    $test = Test-TcpPort -HostName $deviceIp -Port $port
    $portResults[$port] = $test
    Write-Result "TCP $port" $test.Success "$($test.Code), $($test.LatencyMs)ms"
}

Write-Section "5. HTTP service"

$configuredPortOpen = $portResults[$devicePort].Success
if ($configuredPortOpen) {
    try {
        $response = Invoke-WebRequest `
            -Uri "${protocol}://${deviceIp}:${devicePort}/ISAPI/System/deviceInfo" `
            -Method Get `
            -TimeoutSec 5 `
            -UseBasicParsing
        Write-Result "ISAPI HTTP response" $true "HTTP $($response.StatusCode)"
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        if ($status -in @(401, 403)) {
            Write-Result "ISAPI HTTP response" $true "HTTP $status - device is reachable; authentication is the next stage"
        } else {
            Write-Result "ISAPI HTTP response" $false "$($_.Exception.Message)"
        }
    }
} else {
    Write-Result "ISAPI HTTP response" $false "Skipped because configured TCP port $devicePort is unreachable"
}

Write-Section "DIAGNOSIS"

if (-not $sameSubnetAddress -and -not $configuredPortOpen) {
    Write-Host "ROOT CAUSE: No usable network path to the puncher." -ForegroundColor Red
    Write-Host ""
    Write-Host "The PC and terminal are configured on different /24 networks, and"
    Write-Host "the configured device port cannot be reached."
    Write-Host ""
    Write-Host "NEXT ACTION:" -ForegroundColor Yellow
    Write-Host "  Run: npm run network:connect"
    Write-Host "  Approve the Windows UAC prompt."
    Write-Host "  If that still fails, connect both devices to the same LAN and"
    Write-Host "  disable Wi-Fi/AP client isolation, or change the terminal to 192.168.1.x."
} elseif (-not $configuredPortOpen) {
    Write-Host "ROOT CAUSE: The device network is reachable, but its configured HTTP port is not." -ForegroundColor Red
    Write-Host "Check the terminal's HTTP/HTTPS port and web/ISAPI service settings."
} else {
    Write-Host "NETWORK PATH IS WORKING." -ForegroundColor Green
    Write-Host "Restart the backend and use /api/sync-punches. Any remaining error"
    Write-Host "will be HTTP authentication, permission, endpoint, or response-format related."
}

Write-Host ""
Write-Host "Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
