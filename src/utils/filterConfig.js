/**
 * Configuration du filtre de mots
 * Ce fichier contient les paramètres de configuration pour le filtre de mots du bot.
 */

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