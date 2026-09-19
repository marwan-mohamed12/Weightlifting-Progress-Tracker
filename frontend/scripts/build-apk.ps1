$ErrorActionPreference = "Stop"

$frontend = Split-Path -Parent $PSScriptRoot
Set-Location $frontend

$jdk21 = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
if (Test-Path $jdk21) {
    $env:JAVA_HOME = $jdk21
    $env:Path = "$jdk21\bin;" + $env:Path
}

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }

if (-not (Test-Path $sdk)) {
    Write-Host @"
Android SDK not found. Install Android Studio, then run this command again.

1. Install Android Studio: https://developer.android.com/studio
2. Open it once so it downloads the Android SDK
3. From frontend:  npm run apk

The APK is a wrapper around the Angular app. Keep the Spring Boot API running
on your PC (.\mvn21.cmd spring-boot:run) and keep the phone on the same Wi-Fi.
"@
    exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

$ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object -Property PrefixOrigin -Descending |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
    $ip = "10.0.2.2"
    Write-Host "No LAN IPv4 found; using emulator host loopback $ip"
} else {
    Write-Host "API for the APK will be http://$ip`:8080/api"
}

$nativeEnv = @"
export const environment = {
  production: true,
  apiBase: 'http://$ip`:8080/api',
};
"@
[System.IO.File]::WriteAllText((Join-Path $frontend "src\environments\environment.native.ts"), $nativeEnv)

$localProps = Join-Path $frontend "android\local.properties"
$sdkPosix = $sdk -replace '\\', '\\'
@"
sdk.dir=$($sdk -replace '\\', '/')
"@ | Set-Content -Path $localProps -Encoding ascii

Write-Host "Building Angular (native configuration)..."
npx ng build --configuration=native
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Syncing Capacitor Android project..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$gradlew = Join-Path $frontend "android\gradlew.bat"
if (-not (Test-Path $gradlew)) {
    Write-Host "android/ folder is missing. Run: npx cap add android"
    exit 1
}

Write-Host "Assembling debug APK..."
Set-Location (Join-Path $frontend "android")
cmd /c "set JAVA_HOME=$jdk21&& set PATH=%JAVA_HOME%\bin;%PATH%&& set ANDROID_HOME=$sdk&& set ANDROID_SDK_ROOT=$sdk&& gradlew.bat --stop"
cmd /c "set JAVA_HOME=$jdk21&& set PATH=%JAVA_HOME%\bin;%PATH%&& set ANDROID_HOME=$sdk&& set ANDROID_SDK_ROOT=$sdk&& gradlew.bat assembleDebug"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$built = Join-Path $frontend "android\app\build\outputs\apk\debug\app-debug.apk"
$outDir = Join-Path $frontend "apk"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$dest = Join-Path $outDir "plate-debug.apk"
Copy-Item $built $dest -Force

Write-Host ""
Write-Host "APK: $dest"
Write-Host "Copy that file to your phone and open it to install (allow unknown sources)."
Write-Host "Start the API first:  cd backend ; .\mvn21.cmd spring-boot:run"
Write-Host "Phone and PC must be on the same Wi-Fi. API: http://$ip`:8080"
