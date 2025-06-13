# Chemins possibles pour Git
$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
)

# Trouver Git
$gitPath = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitPath = $path
        break
    }
}

if ($null -eq $gitPath) {
    Write-Host "Git n'est pas installé ou n'a pas été trouvé dans les emplacements standard." -ForegroundColor Red
    Write-Host "Veuillez installer Git depuis https://gitforwindows.org/" -ForegroundColor Red
    Write-Host "Appuyez sur une touche pour quitter..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "Git trouvé à : $gitPath" -ForegroundColor Green

# Initialiser le dépôt Git
Write-Host "Initialisation du dépôt Git..." -ForegroundColor Cyan
& $gitPath init

# Configurer l'utilisateur Git si nécessaire
Write-Host "Configuration de l'utilisateur Git..." -ForegroundColor Cyan
$userName = Read-Host "Entrez votre nom d'utilisateur Git"
$userEmail = Read-Host "Entrez votre email Git"
& $gitPath config user.name "$userName"
& $gitPath config user.email "$userEmail"

# Ajouter tous les fichiers
Write-Host "Ajout de tous les fichiers..." -ForegroundColor Cyan
& $gitPath add .

# Créer le commit initial
Write-Host "Création du commit initial..." -ForegroundColor Cyan
& $gitPath commit -m "Initial commit"

# Ajouter le dépôt distant GitHub
Write-Host "Ajout du dépôt distant GitHub..." -ForegroundColor Cyan
& $gitPath remote add origin https://github.com/Samzerrr/lokibot.git

# Configurer la branche principale
Write-Host "Configuration de la branche principale..." -ForegroundColor Cyan
& $gitPath branch -M main

# Pousser le code sur GitHub
Write-Host "Envoi du code sur GitHub..." -ForegroundColor Cyan
& $gitPath push -u origin main

Write-Host "Terminé!" -ForegroundColor Green
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 