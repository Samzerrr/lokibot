const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const filterConfig = require('../utils/filterConfig');
const nicknameFilter = require('../utils/nicknameFilter');

// Chemin vers le fichier de configuration
const configFilePath = path.join(__dirname, '../utils/filterConfig.js');

// Fonction pour sauvegarder la configuration mise à jour
async function saveConfig(config) {
  const configContent = `/**
 * Configuration du filtre de mots
 * Ce fichier contient les paramètres de configuration pour le filtre de mots du bot.
 */

module.exports = {
  // Liste des mots à filtrer (insensible à la casse)
  filteredWords: ${JSON.stringify(config.filteredWords)},
  
  // Activer/désactiver la notification à l'utilisateur quand son message est supprimé
  notifyUser: ${config.notifyUser},
  
  // Message à envoyer à l'utilisateur quand son message est supprimé (si notifyUser est true)
  notificationMessage: '${config.notificationMessage}',
  
  // Activer/désactiver la journalisation des suppressions dans la console
  logDeletions: ${config.logDeletions}
};`;

  return new Promise((resolve, reject) => {
    fs.writeFile(configFilePath, configContent, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        // Réinitialiser le cache du module pour que les changements soient pris en compte
        delete require.cache[require.resolve('../utils/filterConfig')];
        resolve();
      }
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Gérer le filtre de mots')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Afficher la liste des mots filtrés'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter un mot à filtrer')
        .addStringOption(option =>
          option.setName('mot')
            .setDescription('Le mot à ajouter à la liste des mots filtrés')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Retirer un mot de la liste des mots filtrés')
        .addStringOption(option =>
          option.setName('mot')
            .setDescription('Le mot à retirer de la liste des mots filtrés')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('notify')
        .setDescription('Activer/désactiver les notifications aux utilisateurs')
        .addBooleanOption(option =>
          option.setName('activer')
            .setDescription('Activer ou désactiver les notifications')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('nickname')
        .setDescription('Activer/désactiver le renommage des pseudos')
        .addBooleanOption(option =>
          option.setName('activer')
            .setDescription('Activer ou désactiver le renommage des pseudos')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('replacement')
        .setDescription('Définir le pseudo de remplacement')
        .addStringOption(option =>
          option.setName('pseudo')
            .setDescription('Le pseudo à utiliser pour remplacer les pseudos interdits')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Scanner tous les membres pour des pseudos interdits')),
            
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      if (subcommand === 'list') {
        // Afficher la liste des mots filtrés
        if (filterConfig.filteredWords.length === 0) {
          await interaction.reply({ content: 'Aucun mot n\'est actuellement filtré.', ephemeral: true });
        } else {
          const nicknameStatus = filterConfig.nicknames && filterConfig.nicknames.enabled ? 
            `Activé (remplacement: "${filterConfig.nicknames.replacement}")` : 
            'Désactivé';
            
          await interaction.reply({ 
            content: `**Mots actuellement filtrés:**\n${filterConfig.filteredWords.join(', ')}\n\n**Notifications:** ${filterConfig.notifyUser ? 'Activées' : 'Désactivées'}\n\n**Renommage des pseudos:** ${nicknameStatus}`, 
            ephemeral: true 
          });
        }
      } 
      else if (subcommand === 'add') {
        // Ajouter un mot à la liste
        const wordToAdd = interaction.options.getString('mot').toLowerCase();
        
        if (filterConfig.filteredWords.includes(wordToAdd)) {
          await interaction.reply({ content: `Le mot "${wordToAdd}" est déjà dans la liste des mots filtrés.`, ephemeral: true });
        } else {
          const updatedConfig = { ...filterConfig };
          updatedConfig.filteredWords = [...filterConfig.filteredWords, wordToAdd];
          
          await saveConfig(updatedConfig);
          await interaction.reply({ content: `Le mot "${wordToAdd}" a été ajouté à la liste des mots filtrés.`, ephemeral: true });
        }
      } 
      else if (subcommand === 'remove') {
        // Retirer un mot de la liste
        const wordToRemove = interaction.options.getString('mot').toLowerCase();
        
        if (!filterConfig.filteredWords.includes(wordToRemove)) {
          await interaction.reply({ content: `Le mot "${wordToRemove}" n'est pas dans la liste des mots filtrés.`, ephemeral: true });
        } else {
          const updatedConfig = { ...filterConfig };
          updatedConfig.filteredWords = filterConfig.filteredWords.filter(word => word !== wordToRemove);
          
          await saveConfig(updatedConfig);
          await interaction.reply({ content: `Le mot "${wordToRemove}" a été retiré de la liste des mots filtrés.`, ephemeral: true });
        }
      } 
      else if (subcommand === 'notify') {
        // Activer/désactiver les notifications
        const enable = interaction.options.getBoolean('activer');
        
        const updatedConfig = { ...filterConfig };
        updatedConfig.notifyUser = enable;
        
        await saveConfig(updatedConfig);
        await interaction.reply({ 
          content: `Les notifications aux utilisateurs ont été ${enable ? 'activées' : 'désactivées'}.`, 
          ephemeral: true 
        });
      }
      else if (subcommand === 'nickname') {
        // Activer/désactiver le renommage des pseudos
        const enable = interaction.options.getBoolean('activer');
        
        const updatedConfig = { ...filterConfig };
        if (!updatedConfig.nicknames) {
          updatedConfig.nicknames = {
            enabled: enable,
            replacement: 'ANTIQUE ON TOP',
            notifyUser: false,
            notificationMessage: 'Votre pseudo a été modifié car il contenait un mot interdit.'
          };
        } else {
          updatedConfig.nicknames.enabled = enable;
        }
        
        await saveConfig(updatedConfig);
        await interaction.reply({ 
          content: `Le renommage automatique des pseudos a été ${enable ? 'activé' : 'désactivé'}.`, 
          ephemeral: true 
        });
      }
      else if (subcommand === 'replacement') {
        // Définir le pseudo de remplacement
        const replacement = interaction.options.getString('pseudo');
        
        const updatedConfig = { ...filterConfig };
        if (!updatedConfig.nicknames) {
          updatedConfig.nicknames = {
            enabled: true,
            replacement: replacement,
            notifyUser: false,
            notificationMessage: 'Votre pseudo a été modifié car il contenait un mot interdit.'
          };
        } else {
          updatedConfig.nicknames.replacement = replacement;
        }
        
        await saveConfig(updatedConfig);
        await interaction.reply({ 
          content: `Le pseudo de remplacement a été défini sur "${replacement}".`, 
          ephemeral: true 
        });
      }
      else if (subcommand === 'scan') {
        // Scanner tous les membres pour des pseudos interdits
        await interaction.deferReply({ ephemeral: true });
        
        const guild = interaction.guild;
        const modifiedCount = await nicknameFilter.checkAllMembers(guild);
        
        await interaction.editReply({ 
          content: `Scan terminé. ${modifiedCount} pseudos ont été modifiés.`, 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du filtre:', error);
      await interaction.reply({ 
        content: 'Une erreur est survenue lors de la modification des paramètres du filtre.', 
        ephemeral: true 
      });
    }
  },
}; 