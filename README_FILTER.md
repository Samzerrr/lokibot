# Système de Filtrage de Mots et de Pseudos

Ce système permet de détecter et supprimer automatiquement les messages contenant certains mots interdits dans votre serveur Discord, ainsi que de renommer les utilisateurs dont le pseudo contient ces mots.

## Fonctionnalités

- Suppression automatique des messages contenant des mots interdits
- Renommage automatique des pseudos contenant des mots interdits
- Configuration facile via des commandes slash
- Possibilité d'activer/désactiver les notifications aux utilisateurs
- Journalisation des suppressions et des renommages dans la console

## Configuration par défaut

Par défaut, le système est configuré pour :
- Filtrer le mot "mudae" dans les messages et les pseudos
- Remplacer les pseudos contenant "mudae" par "ANTIQUE ON TOP"

Vous pouvez ajouter ou supprimer des mots de la liste selon vos besoins, ainsi que modifier le pseudo de remplacement.

## Commandes disponibles

Le bot propose plusieurs commandes slash pour gérer le filtre de mots et de pseudos:

### `/filter list`

Affiche la liste des mots actuellement filtrés, l'état des notifications et l'état du renommage des pseudos.

### `/filter add [mot]`

Ajoute un mot à la liste des mots filtrés. Le mot sera détecté quelle que soit sa casse (majuscules/minuscules).

### `/filter remove [mot]`

Retire un mot de la liste des mots filtrés.

### `/filter notify [activer]`

Active ou désactive les notifications envoyées aux utilisateurs lorsque leurs messages sont supprimés.

### `/filter nickname [activer]`

Active ou désactive le renommage automatique des pseudos contenant des mots interdits.

### `/filter replacement [pseudo]`

Définit le pseudo de remplacement à utiliser lorsqu'un pseudo contient un mot interdit.

### `/filter scan`

Lance un scan manuel de tous les membres du serveur pour détecter et modifier les pseudos contenant des mots interdits.

## Personnalisation avancée

Pour une personnalisation plus avancée, vous pouvez modifier directement le fichier `src/utils/filterConfig.js`:

```js
module.exports = {
  // Liste des mots à filtrer (insensible à la casse)
  filteredWords: ['mudae'],
  
  // Activer/désactiver la notification à l'utilisateur quand son message est supprimé
  notifyUser: false,
  
  // Message à envoyer à l'utilisateur quand son message est supprimé (si notifyUser est true)
  notificationMessage: 'Votre message a été supprimé car il contenait un mot interdit.',
  
  // Activer/désactiver la journalisation des suppressions dans la console
  logDeletions: true,
  
  // Configuration pour le renommage des pseudos
  nicknames: {
    // Activer/désactiver le renommage des pseudos contenant des mots interdits
    enabled: true,
    
    // Nouveau pseudo à appliquer quand un pseudo contient un mot interdit
    replacement: 'ANTIQUE ON TOP',
    
    // Activer/désactiver la notification à l'utilisateur quand son pseudo est modifié
    notifyUser: false,
    
    // Message à envoyer à l'utilisateur quand son pseudo est modifié (si notifyUser est true)
    notificationMessage: 'Votre pseudo a été modifié car il contenait un mot interdit.'
  }
};
```

## Remarques importantes

- Seuls les administrateurs du serveur peuvent utiliser les commandes de gestion du filtre.
- Le système détecte les mots même s'ils font partie d'un mot plus long.
- Les messages des bots ne sont pas filtrés et leurs pseudos ne sont pas modifiés.
- Si vous activez les notifications, assurez-vous que les utilisateurs peuvent recevoir des messages privés du bot.
- Le bot doit avoir les permissions nécessaires pour modifier les pseudos des membres.
- Le bot vérifie automatiquement les pseudos des nouveaux membres et des membres qui changent leur pseudo.
- Un scan complet est effectué au démarrage du bot pour vérifier tous les membres existants. 