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
  logDeletions: true
}; 