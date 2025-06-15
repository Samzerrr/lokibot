/**
 * Gestionnaire de filtrage de pseudos
 * Ce module gère la détection et la modification des pseudos contenant des mots interdits.
 */

const filterConfig = require('./filterConfig');

/**
 * Vérifie si un pseudo contient des mots interdits
 * @param {string} nickname - Le pseudo à vérifier
 * @returns {boolean} - true si le pseudo contient un mot interdit, false sinon
 */
function containsFilteredWord(nickname) {
  if (!nickname) return false;
  
  const lowerNickname = nickname.toLowerCase();
  return filterConfig.filteredWords.some(word => lowerNickname.includes(word.toLowerCase()));
}

/**
 * Traite un membre pour vérifier et modifier son pseudo si nécessaire
 * @param {Object} member - L'objet membre Discord (GuildMember)
 * @returns {Promise<boolean>} - true si le pseudo a été modifié, false sinon
 */
async function processMember(member) {
  // Vérifier si la fonctionnalité est activée
  if (!filterConfig.nicknames || !filterConfig.nicknames.enabled) return false;
  
  // Ignorer les bots
  if (member.user.bot) return false;
  
  // Récupérer le pseudo actuel (ou le nom d'utilisateur si pas de pseudo)
  const currentNickname = member.nickname || member.user.username;
  
  // Vérifier si le pseudo contient un mot interdit
  if (containsFilteredWord(currentNickname)) {
    try {
      // Modifier le pseudo
      await member.setNickname(filterConfig.nicknames.replacement, 'Pseudo contenant un mot interdit');
      
      // Journaliser la modification
      console.log(`Pseudo modifié pour ${member.user.tag}: "${currentNickname}" -> "${filterConfig.nicknames.replacement}"`);
      
      // Notifier l'utilisateur si activé
      if (filterConfig.nicknames.notifyUser) {
        try {
          await member.user.send(filterConfig.nicknames.notificationMessage);
        } catch (notifyError) {
          console.error('Impossible d\'envoyer une notification à l\'utilisateur:', notifyError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la modification du pseudo:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Vérifie tous les membres d'une guilde pour des pseudos interdits
 * @param {Object} guild - L'objet guilde Discord (Guild)
 * @returns {Promise<number>} - Le nombre de pseudos modifiés
 */
async function checkAllMembers(guild) {
  // Vérifier si la fonctionnalité est activée
  if (!filterConfig.nicknames || !filterConfig.nicknames.enabled) return 0;
  
  let modifiedCount = 0;
  
  try {
    // Récupérer tous les membres de la guilde
    const members = await guild.members.fetch();
    
    // Vérifier chaque membre
    for (const [memberId, member] of members) {
      const wasModified = await processMember(member);
      if (wasModified) modifiedCount++;
    }
    
    return modifiedCount;
  } catch (error) {
    console.error('Erreur lors de la vérification des membres:', error);
    return modifiedCount;
  }
}

module.exports = {
  processMember,
  checkAllMembers,
  containsFilteredWord
}; 