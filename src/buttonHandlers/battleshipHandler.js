const { BattleshipManager } = require('../games/battleship/BattleshipManager');
const { BattleshipButtons } = require('../games/battleship/BattleshipButtons');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Objet qui stocke l'état de sélection des boutons pour chaque joueur
const playerSelections = new Map();

/**
 * Gestionnaire pour les boutons de la bataille navale
 */
module.exports = {
  prefix: ['select_ship_', 'ready', 'cancel_placement'],

  async execute(interaction, client) {
    try {
      const customId = interaction.customId;
      const playerId = interaction.user.id;
      
      console.log(`Bouton cliqué : ${customId} par ${playerId}`);
      
      // Récupérer la partie du joueur
      const game = BattleshipManager.getGameByPlayer(playerId);
      
      if (!game) {
        await interaction.reply({ content: 'Vous n\'êtes pas dans une partie de Bataille Navale.', ephemeral: true });
        return;
      }
      
      // Vérifier si la partie est en phase de préparation
      if (game.gameState !== 'SETUP') {
        await interaction.reply({ content: 'La partie a déjà commencé, vous ne pouvez plus placer de navires.', ephemeral: true });
        return;
      }
      
      // Vérifier si le joueur est déjà prêt
      const player = game.getPlayer(playerId);
      if (player.ready) {
        await interaction.reply({ content: 'Vous êtes déjà prêt, vous ne pouvez plus placer de navires.', ephemeral: true });
        return;
      }
      
      // Traitement en fonction du type de bouton
      if (customId.startsWith('select_ship_')) {
        // Sélection d'un navire
        const shipType = customId.replace('select_ship_', '');
        
        // Récupérer les informations du navire
        const shipInfo = game.shipTypes[shipType];
        
        console.log(`Navire sélectionné : ${shipType} (${shipInfo.name})`);
        
        // Créer un formulaire modal pour demander la position
        const modal = new ModalBuilder()
          .setCustomId(`place_ship_${shipType}`)
          .setTitle(`Placement du ${shipInfo.name} (${shipInfo.size} cases)`);
        
        // Champ pour la position
        const positionInput = new TextInputBuilder()
          .setCustomId('position')
          .setLabel('Position (ex: A0)')
          .setPlaceholder('Entrez une lettre (A-J) suivie d\'un chiffre (0-9)')
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(2)
          .setStyle(TextInputStyle.Short);
        
        // Champ pour l'orientation - raccourci pour respecter la limite de 45 caractères
        const orientationInput = new TextInputBuilder()
          .setCustomId('orientation')
          .setLabel('Orientation')
          .setPlaceholder('Entrez H (horizontal) ou V (vertical)')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(1)
          .setStyle(TextInputStyle.Short);
        
        // Ajouter les champs au formulaire
        const positionRow = new ActionRowBuilder().addComponents(positionInput);
        const orientationRow = new ActionRowBuilder().addComponents(orientationInput);
        
        modal.addComponents(positionRow, orientationRow);
        
        // Ouvrir le formulaire
        await interaction.showModal(modal);
        console.log(`Formulaire modal affiché pour le navire ${shipType}`);
        
      } else if (customId === 'ready') {
        // Le joueur se déclare prêt
        const result = game.setPlayerReady(playerId);
        
        if (!result.success) {
          await interaction.reply({ content: result.message, ephemeral: true });
          return;
        }
        
        await interaction.update({ content: result.message, components: [] });
        
        // Vérifier si la partie peut commencer
        if (game.isReadyToStart()) {
          const startResult = game.start();
          
          if (startResult.success) {
            // Créer un embed pour le début de la partie
            const embed = {
              color: 0x00FF00,
              title: '🚢 La partie commence !',
              description: `La partie de Bataille Navale commence ! C'est au tour de **${startResult.currentPlayer}** de jouer.\n\nUtilisez la commande \`/fire\` pour tirer sur une case de la grille adverse.`,
              timestamp: new Date(),
              footer: {
                text: 'Bataille Navale | Dev by Samzerrr'
              }
            };
            
            // Envoyer un message dans le canal pour annoncer le début de la partie
            const channel = await client.channels.fetch(game.channelId);
            await channel.send({ embeds: [embed] });
          }
        } else {
          // Annoncer au canal que le joueur est prêt
          const channel = await client.channels.fetch(game.channelId);
          await channel.send(`**${interaction.user.username}** est prêt ! En attente que l'autre joueur soit prêt...`);
        }
        
      } else if (customId === 'cancel_placement') {
        // Annuler le placement en cours
        
        // Récupérer les navires restants à placer
        const remainingShips = game.getRemainingShips(playerId);
        
        // Créer un embed pour afficher la grille du joueur
        const embed = {
          color: 0x0099FF,
          title: '🚢 Placement des navires',
          description: 'Sélectionnez un navire à placer',
          fields: [
            {
              name: 'Votre grille',
              value: `\`\`\`\n${game.getPlayerBoard(playerId, true)}\`\`\``
            },
            {
              name: 'Navires restants à placer',
              value: formatRemainingShips(remainingShips)
            }
          ],
          timestamp: new Date(),
          footer: {
            text: 'Bataille Navale | Dev by Samzerrr'
          }
        };
        
        // Créer les boutons pour la sélection des navires
        const components = BattleshipButtons.createShipSelectionButtons(remainingShips);
        
        await interaction.update({ embeds: [embed], components: components });
      }
    } catch (error) {
      console.error('Erreur dans le gestionnaire de boutons :', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Une erreur est survenue lors du traitement de cette interaction.', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'Une erreur est survenue lors du traitement de cette interaction.', ephemeral: true });
      }
    }
  }
};

/**
 * Formate l'affichage des navires restants
 * @param {object} remainingShips - Les navires restants
 * @returns {string} - Le texte formaté
 */
function formatRemainingShips(remainingShips) {
  let result = '';
  
  for (const [type, info] of Object.entries(remainingShips)) {
    if (info && info.remaining && info.remaining > 0) {
      result += `- ${info.name} (${info.size} cases) : ${info.remaining}\n`;
    }
  }
  
  if (result === '') {
    result = 'Tous les navires ont été placés ! Utilisez le bouton "Je suis prêt" pour commencer la partie.';
  }
  
  return result;
} 