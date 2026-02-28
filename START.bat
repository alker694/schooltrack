@echo off
title SchoolTrack — Attendance System

:: ─── Check if Node.js is installed ───────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Node.js is not installed!
    echo  Please install Node.js from https://nodejs.org
    echo  Download the LTS version and run this file again.
    echo.
    pause
    exit /b 1
)

:: ─── Move to script directory ────────────────────────────
cd /d "%~dp0"

:: ─── Install dependencies if needed ──────────────────────
if not exist "node_modules" (
    echo.
    echo  Installing dependencies (first-time setup)...
    echo  This will take a minute. Please wait.
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  ERROR: Failed to install dependencies.
        echo  Check your internet connection for first-time setup.
        pause
        exit /b 1
    )
)

:: ─── Start the server ────────────────────────────────────
echo.
echo  ══════════════════════════════════════════════
echo    SchoolTrack — Attendance Management System
echo  ══════════════════════════════════════════════
echo.
echo  Starting local server...
echo  The system will open in your browser automatically.
echo.
echo  To access from PHONE: connect phone to same WiFi,
echo  then open the Network address shown below.
echo.
echo  Press CTRL+C to stop the server.
echo  ══════════════════════════════════════════════
echo.

node server.js

pause
