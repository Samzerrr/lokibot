Write-Host "Téléchargement de Git pour Windows..." -ForegroundColor Green
$url = "https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe"
$outPath = "$env:TEMP\GitInstaller.exe"
Invoke-WebRequest -Uri $url -OutFile $outPath

Write-Host "Installation de Git..." -ForegroundColor Green
Start-Process -FilePath $outPath -ArgumentList "/VERYSILENT /NORESTART" -Wait

Write-Host "Installation terminée. Veuillez redémarrer votre terminal pour utiliser Git." -ForegroundColor Green
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 