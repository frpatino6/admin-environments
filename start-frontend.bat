@echo off
cd /d "d:\GitFlyr\admin-environments\frontend"
set PATH=C:\ProgramData\nvm\v20.20.0;%PATH%
echo Node version:
node --version
echo.
echo Starting Angular dev server...
npm start
