@echo off
setlocal
echo ============================================
echo   InkLabs - stopping dev servers
echo ============================================

rem Kill the cmd.exe trees started by start.bat (cmd -> npm -> node --watch / vite).
rem Matching on the command line works whether the window is a classic console or a Windows Terminal tab.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'cmd.exe' -and ($_.CommandLine -like '*InkLabs Server*' -or $_.CommandLine -like '*InkLabs Client*') } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }"
taskkill /FI "WINDOWTITLE eq InkLabs Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq InkLabs Client*" /T /F >nul 2>&1

rem Fallback: kill whatever is still listening on the API / Vite ports
for %%P in (4000 5173) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
        taskkill /PID %%A /F >nul 2>&1
    )
)

echo Stopped. (PostgreSQL service is left running.)
endlocal
