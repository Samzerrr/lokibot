/**
 * Gestionnaire de filtrage de messages
 * Ce module gère la détection et la suppression des messages contenant des mots interdits.
 */

const filterConfig = require('./filterConfig');

/**
 * Vérifie si un message contient des mots interdits
 * @param {string} content - Le contenu du message à vérifier
 * @returns {boolean} - true si le message contient un mot interdit, false sinon
 */
function containsFilteredWord(content) {
  const lowerContent = content.toLowerCase();
  return filterConfig.filteredWords.some(word => lowerContent.includes(word.toLowerCase()));
}

/**
 * Traite un message pour vérifier et supprimer si nécessaire
 * @param {Object} message - L'objet message Discord
 * @returns {Promise<boolean>} - true si le message a été supprimé, false sinon
 */
async function processMessage(message) {
  // Ignorer les messages des bots
  if (message.author.bot) return false;
  
  // Vérifier si le message contient un mot interdit
  if (containsFilteredWord(message.content)) {
    try {
      // Supprimer le message
      await message.delete();
      
      // Journaliser la suppression si activé
      if (filterConfig.logDeletions) {
        console.log(`Message contenant un mot interdit supprimé. Auteur: ${message.author.tag}, Canal: ${message.channel.name}`);
      }
      
      // Notifier l'utilisateur si activé
      if (filterConfig.notifyUser) {
        try {
          await message.author.send(filterConfig.notificationMessage);
        } catch (notifyError) {
          console.error('Impossible d\'envoyer une notification à l\'utilisateur:', notifyError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
      return false;
    }
  }
  
  return false;
}

module.exports = {
  processMessage,
  containsFilteredWord
}; 