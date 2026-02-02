# Script PowerShell para iniciar la aplicación completa

Write-Host "🚀 Iniciando Admin Environments..." -ForegroundColor Green
Write-Host ""

# Verificar Node.js
$nodeVersion = node -v
Write-Host "📦 Node.js version: $nodeVersion" -ForegroundColor Cyan

# Verificar si la versión es suficiente
$versionNumber = [version]($nodeVersion -replace 'v', '').Split('.')[0..1] -join '.'
if ([float]$versionNumber -lt 20.19) {
    Write-Host "⚠️  ADVERTENCIA: Se requiere Node.js >= v20.19 o v22.x" -ForegroundColor Yellow
    Write-Host "   Tu versión actual: $nodeVersion" -ForegroundColor Yellow
    Write-Host "   Descarga desde: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "¿Deseas continuar de todas formas? (s/n)"
    if ($continue -ne 's') {
        exit
    }
}

Write-Host ""

# Iniciar Backend
Write-Host "🔧 Iniciando Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Esperar 5 segundos
Write-Host "⏳ Esperando a que el backend se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host ""
Write-Host "✅ Aplicación iniciada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Se abrieron 2 ventanas de PowerShell:" -ForegroundColor White
Write-Host "   1. Backend (puerto 3000)" -ForegroundColor White
Write-Host "   2. Frontend (puerto 4200)" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Para detener, cierra ambas ventanas" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
