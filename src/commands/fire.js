const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BattleshipManager } = require('../games/battleship/BattleshipManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fire')
    .setDescription('Tire sur une case de la grille adverse')
    .addStringOption(option =>
      option.setName('position')
        .setDescription('Position à cibler (ex: A0)')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    // Récupérer la partie du joueur
    const game = BattleshipManager.getGameByPlayer(interaction.user.id);
    
    if (!game) {
      await interaction.reply({ content: 'Vous n\'êtes pas dans une partie de Bataille Navale.', ephemeral: true });
      return;
    }
    
    // Vérifier si la partie est en cours
    if (game.gameState !== 'PLAYING') {
      await interaction.reply({ content: 'La partie n\'est pas encore commencée ou est déjà terminée.', ephemeral: true });
      return;
    }
    
    // Vérifier si c'est le tour du joueur
    if (game.currentPlayer !== interaction.user.id) {
      await interaction.reply({ content: 'Ce n\'est pas votre tour.', ephemeral: true });
      return;
    }
    
    // Récupérer la position
    const position = interaction.options.getString('position').toUpperCase();
    
    // Valider la position
    if (!/^[A-J][0-9]$/.test(position)) {
      await interaction.reply({ content: 'Position invalide. Utilisez une lettre (A-J) suivie d\'un chiffre (0-9).', ephemeral: true });
      return;
    }
    
    // Convertir la position en coordonnées
    const col = position.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(position.charAt(1));
    
    // Effectuer le tir
    const result = game.makeShot(interaction.user.id, row, col);
    
    if (!result.success) {
      await interaction.reply({ content: result.message, ephemeral: true });
      return;
    }
    
    // Créer un embed pour le résultat du tir
    const embed = new EmbedBuilder()
      .setColor(result.hit ? 0xFF0000 : 0x0099FF)
      .setTitle(`🎯 Tir en ${position}`)
      .setDescription(result.message)
      .setTimestamp()
      .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
    
    // Ajouter des informations supplémentaires si un navire est coulé
    if (result.sunk) {
      embed.addFields(
        {
          name: 'Navire coulé',
          value: result.shipName
        }
      );
    }
    
    // Afficher le résultat du tir (visible par tous)
    await interaction.reply({ embeds: [embed] });
    
    // Obtenir le nom du prochain joueur
    const nextPlayerName = game.players[game.currentPlayer].username;
    
    // Créer un embed pour les grilles (visible uniquement par le joueur)
    const boardsEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🚢 Vos grilles de Bataille Navale')
      .setDescription(`${result.hit ? 'Vous avez touché un navire ennemi !' : `Vous avez manqué. C'est au tour de **${nextPlayerName}**.`}`)
      .setTimestamp()
      .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
    
    // Ajouter les grilles à l'embed
    const playerBoard = game.getPlayerBoard(interaction.user.id, true);
    const shotsBoard = game.getShotsBoard(interaction.user.id);
    
    boardsEmbed.addFields(
      {
        name: 'Votre flotte',
        value: `\`\`\`\n${playerBoard}\`\`\``
      },
      {
        name: 'Vos tirs',
        value: `\`\`\`\n${shotsBoard}\`\`\``
      }
    );
    
    // Ajouter la légende
    boardsEmbed.addFields(
      {
        name: 'Légende',
        value: `P = Porte-avions (5 cases)
C = Cuirassé (4 cases)
R = Croiseur (3 cases)
S = Sous-marin (3 cases)
D = Contre-torpilleur (2 cases)
X = Touché
O = Manqué
~ = Eau
· = Non exploré`
      }
    );
    
    // Envoyer les grilles en message privé (visible uniquement par le joueur)
    await interaction.followUp({ embeds: [boardsEmbed], ephemeral: true });
    
    // Si la partie est terminée
    if (result.gameOver) {
      const winEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🏆 Victoire !')
        .setDescription(`**${interaction.user.username}** a gagné la partie de Bataille Navale !`)
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.followUp({ embeds: [winEmbed] });
      
      // Terminer la partie
      BattleshipManager.endGame(game.channelId);
    }
  },
}; 