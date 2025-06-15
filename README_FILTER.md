# Système de Filtrage de Mots

Ce système permet de détecter et supprimer automatiquement les messages contenant certains mots interdits dans votre serveur Discord.

## Fonctionnalités

- Suppression automatique des messages contenant des mots interdits
- Configuration facile via des commandes slash
- Possibilité d'activer/désactiver les notifications aux utilisateurs
- Journalisation des suppressions dans la console

## Configuration par défaut

Par défaut, le système est configuré pour filtrer le mot "mudae". Vous pouvez ajouter ou supprimer des mots de la liste selon vos besoins.

## Commandes disponibles

Le bot propose plusieurs commandes slash pour gérer le filtre de mots:

### `/filter list`

Affiche la liste des mots actuellement filtrés et l'état des notifications.

### `/filter add [mot]`

Ajoute un mot à la liste des mots filtrés. Le mot sera détecté quelle que soit sa casse (majuscules/minuscules).

### `/filter remove [mot]`

Retire un mot de la liste des mots filtrés.

### `/filter notify [activer]`

Active ou désactive les notifications envoyées aux utilisateurs lorsque leurs messages sont supprimés.

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
  logDeletions: true
};
```

## Remarques importantes

- Seuls les administrateurs du serveur peuvent utiliser les commandes de gestion du filtre.
- Le système détecte les mots même s'ils font partie d'un mot plus long.
- Les messages des bots ne sont pas filtrés.
- Si vous activez les notifications, assurez-vous que les utilisateurs peuvent recevoir des messages privés du bot. 