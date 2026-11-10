@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DeepSeek Harness Map

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

echo Starting DeepSeek Harness and the map page...
echo Close this window to stop the local services.
echo.
node "%~dp0start.mjs"
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" echo Launcher exited with code %CODE%.
pause
exit /b %CODE%

:NO_NODE
echo.
echo Node.js was not found. Please install Node.js 20 or newer:
echo https://nodejs.org/
echo.
pause
exit /b 1
