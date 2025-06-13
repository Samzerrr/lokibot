const fs = require('fs');
const path = require('path');
const { ActivityType } = require('discord.js');

// Chemin vers le fichier de statut
const STATUS_FILE = path.join(__dirname, '..', 'data', 'botStatus.json');

/**
 * Convertit une chaîne de type d'activité en constante ActivityType
 * @param {string} activityTypeString - Le type d'activité sous forme de chaîne
 * @returns {number} - La constante ActivityType correspondante
 */
function getActivityTypeConstant(activityTypeString) {
  switch (activityTypeString) {
    case 'PLAYING':
      return ActivityType.Playing;
    case 'WATCHING':
      return ActivityType.Watching;
    case 'LISTENING':
      return ActivityType.Listening;
    case 'STREAMING':
      return ActivityType.Streaming;
    case 'COMPETING':
      return ActivityType.Competing;
    default:
      return ActivityType.Playing;
  }
}

/**
 * Convertit une constante ActivityType en chaîne
 * @param {number} activityType - La constante ActivityType
 * @returns {string} - Le type d'activité sous forme de chaîne
 */
function getActivityTypeString(activityType) {
  switch (activityType) {
    case ActivityType.Playing:
      return 'PLAYING';
    case ActivityType.Watching:
      return 'WATCHING';
    case ActivityType.Listening:
      return 'LISTENING';
    case ActivityType.Streaming:
      return 'STREAMING';
    case ActivityType.Competing:
      return 'COMPETING';
    default:
      return 'PLAYING';
  }
}

/**
 * Charge le statut du bot depuis le fichier
 * @returns {Object} - Les données de statut
 */
function loadStatus() {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(STATUS_FILE)) {
      // Statut par défaut
      const defaultStatus = {
        status: 'online',
        activity: {
          name: '/help',
          type: 'STREAMING',
          url: 'https://www.twitch.tv/samzerrrlive'
        }
      };
      
      // Assurer que le répertoire existe
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Sauvegarder le statut par défaut
      fs.writeFileSync(STATUS_FILE, JSON.stringify(defaultStatus, null, 2), 'utf8');
      return defaultStatus;
    }
    
    // Lire le fichier
    const data = fs.readFileSync(STATUS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors du chargement du statut:', error);
    // Retourner un statut par défaut en cas d'erreur
    return {
      status: 'online',
      activity: {
        name: '/help',
        type: 'STREAMING',
        url: 'https://www.twitch.tv/lokibot'
      }
    };
  }
}

/**
 * Sauvegarde le statut du bot dans le fichier
 * @param {Object} statusData - Les données de statut à sauvegarder
 */
function saveStatus(statusData) {
  try {
    // Assurer que le répertoire existe
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Écrire dans le fichier
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
    console.log('Statut du bot sauvegardé avec succès');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du statut:', error);
  }
}

/**
 * Applique le statut sauvegardé au client Discord
 * @param {Client} client - Le client Discord
 */
function applyStatus(client) {
  try {
    const statusData = loadStatus();
    
    // Créer l'objet d'activité
    const activity = {
      name: statusData.activity.name,
      type: getActivityTypeConstant(statusData.activity.type)
    };
    
    // Ajouter l'URL si disponible pour le streaming
    if (statusData.activity.type === 'STREAMING' && statusData.activity.url) {
      activity.url = statusData.activity.url;
    }
    
    // Définir le statut
    client.user.setPresence({
      activities: [activity],
      status: statusData.status
    });
    
    console.log(`Statut du bot restauré: ${statusData.activity.type} ${statusData.activity.name}`);
  } catch (error) {
    console.error('Erreur lors de l\'application du statut:', error);
  }
}

/**
 * Met à jour et sauvegarde le statut du bot
 * @param {Client} client - Le client Discord
 * @param {string} statusText - Le texte de l'activité
 * @param {string} activityTypeString - Le type d'activité sous forme de chaîne
 * @param {string} streamUrl - L'URL de streaming (optionnel)
 * @param {string} status - Le statut de présence
 */
function updateAndSaveStatus(client, statusText, activityTypeString, streamUrl, status) {
  try {
    // Créer l'objet d'activité pour Discord
    const activityType = getActivityTypeConstant(activityTypeString);
    const activity = {
      name: statusText,
      type: activityType
    };
    
    // Ajouter l'URL si c'est un streaming
    if (activityTypeString === 'STREAMING' && streamUrl) {
      activity.url = streamUrl;
    }
    
    // Définir le statut du bot
    client.user.setPresence({
      activities: [activity],
      status: status
    });
    
    // Préparer les données à sauvegarder
    const statusData = {
      status: status,
      activity: {
        name: statusText,
        type: activityTypeString,
        url: activityTypeString === 'STREAMING' ? streamUrl : null
      }
    };
    
    // Sauvegarder dans le fichier
    saveStatus(statusData);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour et sauvegarde du statut:', error);
    return false;
  }
}

module.exports = {
  loadStatus,
  saveStatus,
  applyStatus,
  updateAndSaveStatus,
  getActivityTypeConstant,
  getActivityTypeString
}; 