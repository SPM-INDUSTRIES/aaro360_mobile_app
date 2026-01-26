# PowerShell script to capture crash logs from Android device
# Run this script after the app crashes to see detailed error information

Write-Host "Clearing logcat buffer..." -ForegroundColor Yellow
adb logcat -c

Write-Host "`nWaiting for app crash... (Press Ctrl+C to stop)" -ForegroundColor Green
Write-Host "Launch the app now and wait for it to crash, then check the output below:`n" -ForegroundColor Cyan

# Capture logs with filtering for the app and React Native errors
adb logcat | Select-String -Pattern "com.aaro360.app|ReactNativeJS|AndroidRuntime|FATAL|Error|Exception" -CaseSensitive:$false
