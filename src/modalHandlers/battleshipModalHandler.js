const { BattleshipManager } = require('../games/battleship/BattleshipManager');
const { BattleshipButtons } = require('../games/battleship/BattleshipButtons');
const { EmbedBuilder } = require('discord.js');

/**
 * Gestionnaire pour les formulaires modaux de la bataille navale
 */
module.exports = {
  prefix: 'place_ship_',

  async execute(interaction, client) {
    try {
      const customId = interaction.customId;
      const playerId = interaction.user.id;
      
      console.log(`Formulaire soumis : ${customId} par ${playerId}`);
      
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
      
      // Récupérer le type de navire depuis l'ID du formulaire
      const shipType = customId.replace('place_ship_', '');
      
      console.log(`Traitement du placement de navire de type ${shipType}`);
      
      // Récupérer les valeurs des champs du formulaire
      const position = interaction.fields.getTextInputValue('position').toUpperCase();
      const orientationInput = interaction.fields.getTextInputValue('orientation').toUpperCase();
      
      console.log(`Position: ${position}, Orientation: ${orientationInput}`);
      
      // Valider la position
      if (!/^[A-J][0-9]$/.test(position)) {
        await interaction.reply({ content: 'Position invalide. Utilisez une lettre (A-J) suivie d\'un chiffre (0-9).', ephemeral: true });
        return;
      }
      
      // Valider l'orientation
      if (orientationInput !== 'H' && orientationInput !== 'V') {
        await interaction.reply({ content: 'Orientation invalide. Utilisez H pour horizontal ou V pour vertical.', ephemeral: true });
        return;
      }
      
      // Convertir la position en coordonnées
      const col = position.charCodeAt(0) - 'A'.charCodeAt(0);
      const row = parseInt(position.charAt(1));
      
      // Convertir l'orientation
      const isVertical = orientationInput === 'V';
      
      console.log(`Coordonnées: (${row}, ${col}), Vertical: ${isVertical}`);
      
      // Placer le navire
      const result = game.placeShip(
        playerId,
        shipType,
        row,
        col,
        isVertical
      );
      
      console.log(`Résultat du placement: ${result.success ? 'Succès' : 'Échec'} - ${result.message}`);
      
      if (!result.success) {
        await interaction.reply({ content: result.message, ephemeral: true });
        return;
      }
      
      // Récupérer l'affichage de la grille
      const boardDisplay = game.getPlayerBoard(playerId, true);
      
      // Récupérer les navires restants à placer
      const remainingShips = result.remainingShips;
      
      // Créer un embed pour afficher le résultat
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Navire placé avec succès')
        .setDescription(result.message)
        .addFields(
          {
            name: 'Votre grille',
            value: `\`\`\`\n${boardDisplay}\`\`\``
          },
          {
            name: 'Navires restants à placer',
            value: formatRemainingShips(remainingShips)
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      // Créer les boutons pour la sélection des navires
      const components = BattleshipButtons.createShipSelectionButtons(remainingShips);
      
      await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
    } catch (error) {
      console.error('Erreur dans le gestionnaire de formulaire :', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Une erreur est survenue lors du traitement de ce formulaire.', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'Une erreur est survenue lors du traitement de ce formulaire.', ephemeral: true });
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
    if (info.remaining > 0) {
      result += `- ${info.name} (${info.size} cases) : ${info.remaining}\n`;
    }
  }
  
  if (result === '') {
    result = 'Tous les navires ont été placés ! Utilisez le bouton "Je suis prêt" pour commencer la partie.';
  }
  
  return result;
} 