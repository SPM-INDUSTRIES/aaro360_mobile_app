# Script to build release APK by temporarily removing expo-dev-client
# This is needed because expo-dev-client includes expo-dev-launcher which causes build errors in release

Write-Host "Building Release APK - Temporarily removing expo-dev-client..." -ForegroundColor Yellow

# Backup package.json
Copy-Item package.json package.json.backup

try {
    # Read package.json and remove expo-dev-client line
    $packageJsonContent = Get-Content package.json -Raw
    if ($packageJsonContent -match '"expo-dev-client"') {
        # Remove the expo-dev-client line (with comma if present)
        $packageJsonContent = $packageJsonContent -replace ',\s*"expo-dev-client":\s*"[^"]*"', ''
        $packageJsonContent = $packageJsonContent -replace '"expo-dev-client":\s*"[^"]*",?\s*', ''
        $packageJsonContent | Set-Content package.json
        Write-Host "Removed expo-dev-client from dependencies" -ForegroundColor Green
    }
    
    # Remove expo-dev-client from node_modules and reinstall
    Write-Host "Removing expo-dev-client from node_modules..." -ForegroundColor Yellow
    if (Test-Path "node_modules\expo-dev-client") {
        Remove-Item -Recurse -Force "node_modules\expo-dev-client"
    }
    if (Test-Path "node_modules\expo-dev-launcher") {
        Remove-Item -Recurse -Force "node_modules\expo-dev-launcher"
    }
    
    Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
    bun install
    
    # Clean and build release APK
    Write-Host "Building release APK..." -ForegroundColor Yellow
    cd android
    ./gradlew clean assembleRelease --no-daemon
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nBUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "Release APK location: android/app/build/outputs/apk/release/app-release.apk" -ForegroundColor Green
    } else {
        Write-Host "`nBUILD FAILED!" -ForegroundColor Red
        exit 1
    }
    
} finally {
    # Restore package.json
    Write-Host "`nRestoring package.json..." -ForegroundColor Yellow
    if (Test-Path package.json.backup) {
        Move-Item package.json.backup package.json -Force
    }
    
    # Reinstall to restore expo-dev-client
    Write-Host "Reinstalling dependencies to restore expo-dev-client..." -ForegroundColor Yellow
    bun install
    
    Write-Host "`nDone! expo-dev-client has been restored for development." -ForegroundColor Green
}
