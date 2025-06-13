const { SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const statusManager = require('../utils/statusManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botstatus')
    .setDescription('Modifier le statut du bot')
    .addStringOption(option => 
      option.setName('texte')
        .setDescription('Le texte du statut à afficher')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type d\'activité')
        .setRequired(true)
        .addChoices(
          { name: 'Joue à', value: 'PLAYING' },
          { name: 'Regarde', value: 'WATCHING' },
          { name: 'Écoute', value: 'LISTENING' },
          { name: 'Stream', value: 'STREAMING' },
          { name: 'En compétition', value: 'COMPETING' }
        ))
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL de streaming (nécessaire uniquement pour le type "Stream")')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('statut')
        .setDescription('Statut du bot')
        .setRequired(false)
        .addChoices(
          { name: 'En ligne', value: 'online' },
          { name: 'Inactif', value: 'idle' },
          { name: 'Ne pas déranger', value: 'dnd' },
          { name: 'Invisible', value: 'invisible' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction, client) {
    try {
      // Différer la réponse pour éviter les timeout d'interaction
      await interaction.deferReply({ ephemeral: true });
      
      // Récupérer les options
      const statusText = interaction.options.getString('texte');
      const activityTypeString = interaction.options.getString('type');
      const streamUrl = interaction.options.getString('url');
      const status = interaction.options.getString('statut') || 'online';
      
      // Vérifier si l'URL est fournie lorsque le type est STREAMING
      if (activityTypeString === 'STREAMING' && !streamUrl) {
        return await interaction.editReply({
          content: 'Vous devez fournir une URL de streaming lorsque vous choisissez le type "Stream".',
          ephemeral: true
        });
      }
      
      // Mettre à jour et sauvegarder le statut
      const success = statusManager.updateAndSaveStatus(
        client,
        statusText,
        activityTypeString,
        streamUrl,
        status
      );
      
      if (success) {
        // Préparer le message de confirmation
        let statusMessage = `Le statut du bot a été mis à jour et sauvegardé : **${activityTypeString.toLowerCase()} ${statusText}** (${status})`;
        if (activityTypeString === 'STREAMING') {
          statusMessage += `\nURL de streaming : ${streamUrl}`;
        }
        
        // Répondre à l'utilisateur
        await interaction.editReply({
          content: statusMessage,
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: 'Une erreur est survenue lors de la mise à jour du statut du bot.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      
      // Gérer la réponse d'erreur en fonction de l'état de l'interaction
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'Une erreur est survenue lors de la mise à jour du statut du bot.',
          ephemeral: true
        }).catch(console.error);
      } else if (!interaction.replied) {
        await interaction.reply({
          content: 'Une erreur est survenue lors de la mise à jour du statut du bot.',
          ephemeral: true
        }).catch(console.error);
      }
    }
  },
}; 