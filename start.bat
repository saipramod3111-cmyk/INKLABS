@echo off
setlocal
cd /d "%~dp0"
title InkLabs Launcher
set PG_SERVICE=postgresql-x64-18

echo ============================================
echo   InkLabs - starting local dev environment
echo ============================================
echo.

rem --- PostgreSQL service ---------------------------------------------------
sc query "%PG_SERVICE%" | find "RUNNING" >nul
if errorlevel 1 (
    echo [db] PostgreSQL service "%PG_SERVICE%" is not running, trying to start it...
    net start "%PG_SERVICE%"
    if errorlevel 1 (
        echo [db] Could not start PostgreSQL. Start it manually ^(services.msc^) and re-run start.bat.
        pause
        exit /b 1
    )
) else (
    echo [db] PostgreSQL service is running.
)

rem --- Environment file -----------------------------------------------------
if not exist "server\.env" (
    echo [env] server\.env not found - creating it from server\.env.example
    copy "server\.env.example" "server\.env" >nul
    echo [env] Edit server\.env and set DATABASE_URL ^(postgres password^), then re-run start.bat.
    pause
    exit /b 1
)

rem --- Dependencies ---------------------------------------------------------
if not exist "server\node_modules" (
    echo [server] Installing dependencies...
    pushd server
    call npm install
    popd
)
if not exist "client\node_modules" (
    echo [client] Installing dependencies...
    pushd client
    call npm install
    popd
)

rem --- Database (create db, apply schema, seed once) ------------------------
echo [db] Preparing database...
pushd server
call npm run db:setup
if errorlevel 1 (
    popd
    echo [db] Database setup failed. Check DATABASE_URL in server\.env.
    pause
    exit /b 1
)
popd

rem --- Start servers in their own windows ------------------------------------
echo [server] Starting API on http://localhost:4000
rem The "title" marker also lands in the cmd.exe command line so end.bat can find the whole tree.
start "InkLabs Server" cmd /k "title InkLabs Server && cd /d "%~dp0server" && npm run dev"
echo [client] Starting Vite on http://localhost:5173
start "InkLabs Client" cmd /k "title InkLabs Client && cd /d "%~dp0client" && npm run dev"

timeout /t 5 /nobreak >nul
start "" http://localhost:5173

echo.
echo InkLabs is running. Run end.bat to stop both servers.
endlocal
