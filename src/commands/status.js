const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BattleshipManager } = require('../games/battleship/BattleshipManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Affiche l\'état actuel de votre partie de Bataille Navale'),
  async execute(interaction, client) {
    // Récupérer la partie du joueur
    const game = BattleshipManager.getGameByPlayer(interaction.user.id);
    
    if (!game) {
      await interaction.reply({ content: 'Vous n\'êtes pas dans une partie de Bataille Navale.', ephemeral: true });
      return;
    }
    
    // Obtenir les informations sur la partie
    const player = game.getPlayer(interaction.user.id);
    const isCurrentPlayer = game.currentPlayer === interaction.user.id;
    
    // Créer un embed pour afficher le statut de la partie
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🚢 État de la partie de Bataille Navale')
      .setTimestamp()
      .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
    
    if (game.gameState === 'SETUP') {
      // Phase de préparation
      const remainingShips = game.getRemainingShips(interaction.user.id);
      const playerBoard = game.getPlayerBoard(interaction.user.id, true);
      
      embed.setDescription('La partie est en phase de préparation. Placez vos navires pour commencer à jouer.')
           .addFields(
              { name: 'Votre grille', value: `\`\`\`\n${playerBoard}\`\`\`` },
              { 
                name: 'Navires restants à placer', 
                value: formatRemainingShips(remainingShips) 
              },
              { 
                name: 'Statut', 
                value: player.ready ? '✅ Vous êtes prêt' : '⏳ En attente de placement' 
              }
            );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (game.gameState === 'PLAYING') {
      // Phase de jeu
      const boards = game.getDiscordBoards(interaction.user.id);
      
      // Obtenir les noms des joueurs
      const playerNames = {};
      const players = Object.values(game.players);
      players.forEach(p => {
        playerNames[p.id] = p.username;
      });
      
      embed.setDescription(`La partie est en cours. ${isCurrentPlayer ? '**C\'est votre tour !**' : `C'est au tour de **${playerNames[game.currentPlayer]}**.`}`)
           .addFields(
              { 
                name: 'Statut', 
                value: isCurrentPlayer ? '🎯 À vous de jouer !' : '⏳ En attente de votre adversaire' 
              }
            );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await interaction.followUp({ content: boards, ephemeral: true });
      
    } else if (game.gameState === 'FINISHED') {
      // Partie terminée
      const isWinner = game.winner === interaction.user.id;
      const winnerName = game.players[game.winner].username;
      
      embed.setColor(isWinner ? 0x00FF00 : 0xFF0000)
           .setTitle(isWinner ? '🏆 Victoire !' : '❌ Défaite')
           .setDescription(`La partie est terminée. **${winnerName}** a gagné !`)
           .addFields(
              { name: 'Votre flotte', value: `\`\`\`\n${game.getPlayerBoard(interaction.user.id, true)}\`\`\`` },
              { name: 'Vos tirs', value: `\`\`\`\n${game.getShotsBoard(interaction.user.id)}\`\`\`` }
            );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

// Fonction pour formater l'affichage des navires restants
function formatRemainingShips(remainingShips) {
  if (!remainingShips) {
    return 'Aucune information disponible sur les navires restants.';
  }
  
  let result = '';
  
  for (const [type, info] of Object.entries(remainingShips)) {
    if (info && info.remaining && info.remaining > 0) {
      result += `- ${info.name} (${info.size} cases) : ${info.remaining}\n`;
    }
  }
  
  if (result === '') {
    result = 'Tous les navires ont été placés ! Utilisez `/ship ready` pour vous déclarer prêt.';
  }
  
  return result;
} 