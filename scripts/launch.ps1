$ErrorActionPreference = 'Stop'

$project = Split-Path -Parent $PSScriptRoot
$port = 3000
$localUrl = "http://localhost:$port/carrito"

function Show-Popup {
  param([string]$Text, [string]$Title = 'Stashly', [string]$Icon = 'Information')
  Add-Type -AssemblyName System.Windows.Forms
  $iconEnum = [System.Windows.Forms.MessageBoxIcon]$Icon
  [System.Windows.Forms.MessageBox]::Show($Text, $Title, [System.Windows.Forms.MessageBoxButtons]::OK, $iconEnum) | Out-Null
}

function Test-Port {
  param([int]$Port)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(400)) { return $false }
    $client.EndConnect($iar)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Get-LanIp {
  try {
    $cfg = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object {
      $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' -and
      $_.IPv4Address.IPAddress -notmatch '^169\.254\.'
    } | Select-Object -First 1
    if ($cfg) { return $cfg.IPv4Address.IPAddress }
  } catch {}
  try {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
      $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notmatch '^169\.254\.' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } | Select-Object -First 1).IPAddress
    if ($ip) { return $ip }
  } catch {}
  return $null
}

try {
  Set-Location $project

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Show-Popup "No se encontró Node.js. Instálalo y vuelve a intentarlo." 'Stashly - Error' 'Error'
    exit 1
  }

  $alreadyRunning = $false
  if (Test-Port $port) {
    $isStashly = $false
    try {
      $resp = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 3
      $isStashly = $resp.Content -match 'Stashly'
    } catch {}
    if (-not $isStashly) {
      Show-Popup "El puerto $port está ocupado por otra aplicación. Ciérrala y vuelve a intentarlo." 'Stashly - Error' 'Error'
      exit 1
    }
    $alreadyRunning = $true
  }

  if (-not $alreadyRunning) {
    $distIndex = Join-Path $project 'dist\index.html'
    $needsBuild = -not (Test-Path $distIndex)

    if (-not $needsBuild) {
      $distTime = (Get-Item $distIndex).LastWriteTimeUtc
      $sources = @()
      $sources += Get-ChildItem (Join-Path $project 'client\src') -Recurse -File -ErrorAction SilentlyContinue
      foreach ($extra in @('index.html', 'vite.config.ts', 'package.json')) {
        $p = Join-Path $project $extra
        if (Test-Path $p) { $sources += Get-Item $p }
      }
      if ($sources | Where-Object { $_.LastWriteTimeUtc -gt $distTime } | Select-Object -First 1) {
        $needsBuild = $true
      }
    }

    if ($needsBuild) {
      Write-Host 'Compilando Stashly...'
      & npm run build
      if ($LASTEXITCODE -ne 0) { throw 'La compilación falló.' }
    }

    Write-Host 'Iniciando servidor...'
    Start-Process -FilePath (Join-Path $PSScriptRoot 'run-server.bat') -WorkingDirectory $project -WindowStyle Minimized | Out-Null

    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline -and -not (Test-Port $port)) {
      Start-Sleep -Milliseconds 400
    }

    if (-not (Test-Port $port)) {
      throw "El servidor no respondió en el puerto $port."
    }
  }

  Start-Process $localUrl

  $ip = Get-LanIp
  $lines = @(
    'Stashly está en marcha.',
    '',
    'En este equipo:',
    "  $localUrl",
    ''
  )
  if ($ip) {
    $lines += 'Desde tu red local:'
    $lines += "  http://${ip}:$port/carrito"
    $lines += ''
    $lines += 'Comparte el enlace de red con quien quieras.'
  } else {
    $lines += 'No se pudo detectar la IP de red local.'
  }
  $lines += ''
  $lines += 'La ventana minimizada "Stashly Server" mantiene la web activa.'
  $lines += 'Ciérrala para detener el servidor.'
  $lines += 'Si el enlace de red no carga, permite Node.js en el Firewall de Windows.'

  Show-Popup ($lines -join "`n")
} catch {
  Show-Popup "No se pudo iniciar Stashly:`n`n$($_.Exception.Message)" 'Stashly - Error' 'Error'
  exit 1
}
