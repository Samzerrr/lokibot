$gitPath = "C:\Program Files\Git\bin\git.exe"

# Vérifier si Git est disponible
if (-not (Test-Path $gitPath)) {
    Write-Host "Git n'est pas trouvé à l'emplacement attendu." -ForegroundColor Red
    exit 1
}

# Ajouter les changements (fichiers supprimés)
Write-Host "Ajout des changements..." -ForegroundColor Cyan
& $gitPath add -u

# Créer un commit
Write-Host "Création du commit..." -ForegroundColor Cyan
& $gitPath commit -m "Suppression des fichiers d'installation et de déploiement"

# Pousser les changements sur GitHub
Write-Host "Envoi des changements sur GitHub..." -ForegroundColor Cyan
& $gitPath push origin main

Write-Host "Terminé!" -ForegroundColor Green 