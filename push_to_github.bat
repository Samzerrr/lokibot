@echo off
echo Initialisation du dépôt Git...
git init

echo Ajout de tous les fichiers...
git add .

echo Création du commit initial...
git commit -m "Initial commit"

echo Ajout du dépôt distant GitHub...
git remote add origin https://github.com/Samzerrr/lokibot.git

echo Configuration de la branche principale...
git branch -M main

echo Envoi du code sur GitHub...
git push -u origin main

echo Terminé!
pause 