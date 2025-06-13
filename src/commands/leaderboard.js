const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Leaderboard } = require('../leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des joueurs')
    .addSubcommand(subcommand =>
      subcommand
        .setName('general')
        .setDescription('Affiche le classement général')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('battleship')
        .setDescription('Affiche le classement de Bataille Navale')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('undercover')
        .setDescription('Affiche le classement de Undercover')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Affiche les statistiques d\'un joueur')
        .addUserOption(option =>
          option
            .setName('joueur')
            .setDescription('Le joueur dont vous voulez voir les statistiques')
            .setRequired(true)
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'general') {
      // Classement général (top 10 par points)
      const topPlayers = Leaderboard.getTopPlayers(10);
      
      if (topPlayers.length === 0) {
        await interaction.reply('Aucun joueur dans le classement pour le moment.');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🏆 Classement Général')
        .setDescription('Top 10 des joueurs par points')
        .setTimestamp()
        .setFooter({ text: 'Classement | Dev by Samzerrr' });
      
      // Ajouter les joueurs au classement
      let leaderboardText = '';
      topPlayers.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        leaderboardText += `${medal} **${player.username}** - ${player.totalPoints} points (${player.wins} victoires)\n`;
      });
      
      embed.addFields({ name: 'Classement', value: leaderboardText });
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === 'battleship') {
      // Classement Bataille Navale (top 10 par victoires)
      const gameLeaderboard = Leaderboard.getGameLeaderboard('battleship', 10);
      
      if (gameLeaderboard.length === 0) {
        await interaction.reply('Aucun joueur dans le classement de Bataille Navale pour le moment.');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🚢 Classement Bataille Navale')
        .setDescription('Top 10 des joueurs par victoires')
        .setTimestamp()
        .setFooter({ text: 'Classement | Dev by Samzerrr' });
      
      // Ajouter les joueurs au classement
      let leaderboardText = '';
      gameLeaderboard.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
        leaderboardText += `${medal} **${player.username}** - ${player.wins} victoires (${player.games} parties, ${winRate}% de victoires)\n`;
      });
      
      embed.addFields({ name: 'Classement', value: leaderboardText });
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === 'undercover') {
      // Classement Undercover (top 10 par victoires)
      const gameLeaderboard = Leaderboard.getGameLeaderboard('undercover', 10);
      
      if (gameLeaderboard.length === 0) {
        await interaction.reply('Aucun joueur dans le classement de Undercover pour le moment.');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🕵️ Classement Undercover')
        .setDescription('Top 10 des joueurs par victoires')
        .setTimestamp()
        .setFooter({ text: 'Classement | Dev by Samzerrr' });
      
      // Ajouter les joueurs au classement
      let leaderboardText = '';
      gameLeaderboard.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
        leaderboardText += `${medal} **${player.username}** - ${player.wins} victoires (${player.games} parties, ${winRate}% de victoires)\n`;
      });
      
      embed.addFields({ name: 'Classement', value: leaderboardText });
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === 'player') {
      // Statistiques d'un joueur spécifique
      const user = interaction.options.getUser('joueur');
      const playerStats = Leaderboard.getPlayerStats(user.id);
      
      if (!playerStats) {
        await interaction.reply(`${user.username} n'a pas encore joué de parties.`);
        return;
      }
      
      // Obtenir les statistiques par jeu
      const battleshipStats = Leaderboard.getPlayerGameStats(user.id, 'battleship') || { wins: 0, games: 0 };
      const undercoverStats = Leaderboard.getPlayerGameStats(user.id, 'undercover') || { wins: 0, games: 0 };
      
      // Calculer les taux de victoire
      const totalWinRate = playerStats.games > 0 ? Math.round((playerStats.wins / playerStats.games) * 100) : 0;
      const battleshipWinRate = battleshipStats.games > 0 ? Math.round((battleshipStats.wins / battleshipStats.games) * 100) : 0;
      const undercoverWinRate = undercoverStats.games > 0 ? Math.round((undercoverStats.wins / undercoverStats.games) * 100) : 0;
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Statistiques de ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Points totaux', value: `${playerStats.totalPoints}`, inline: true },
          { name: 'Victoires totales', value: `${playerStats.wins}/${playerStats.games} (${totalWinRate}%)`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Bataille Navale', value: `${battleshipStats.wins} victoires / ${battleshipStats.games} parties (${battleshipWinRate}%)`, inline: true },
          { name: 'Undercover', value: `${undercoverStats.wins} victoires / ${undercoverStats.games} parties (${undercoverWinRate}%)`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Statistiques | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [embed] });
    }
  },
}; 