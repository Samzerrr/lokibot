const { SlashCommandBuilder } = require('discord.js');
const { GameManager } = require('../game/GameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Permet à Mr. White de deviner le mot des civils')
    .addStringOption(option =>
      option.setName('mot')
        .setDescription('Le mot que vous pensez être celui des civils')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const game = GameManager.getGame(interaction.channelId);
    if (!game || !game.isStarted) {
      await interaction.reply({ content: 'Aucune partie en cours dans ce salon.', ephemeral: true });
      return;
    }
    
    const playerId = interaction.user.id;
    const word = interaction.options.getString('mot');
    
    // Tenter de deviner le mot
    const result = game.guessCivilWord(playerId, word);
    
    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }
    
    // Répondre en privé pour confirmer la tentative
    await interaction.reply({ 
      content: `Vous avez tenté de deviner le mot des civils : "${word}"`, 
      ephemeral: true 
    });
    
    // Si la réponse est correcte, Mr. White gagne
    if (result.isCorrect) {
      // Créer un embed pour la victoire de Mr. White
      const winEmbed = {
        color: 0x00ff00,
        title: 'Mr. White a deviné le mot !',
        description: `**${result.player.username}** a correctement deviné le mot des civils : **${result.actualWord}**`,
        fields: [
          {
            name: 'Résultat',
            value: 'Mr. White gagne la partie !'
          }
        ],
        timestamp: new Date(),
        footer: {
          text: 'Undercover Game | Dev by Samzerrr'
        }
      };
      
      await interaction.followUp({ embeds: [winEmbed] });
      await interaction.followUp(game.getMrWhiteWinMessage(result.player));
      GameManager.endGame(interaction.channelId);
    } else {
      // Si la réponse est incorrecte, Mr. White est éliminé
      result.player.alive = false;
      
      // Créer un embed pour l'échec de Mr. White
      const failEmbed = {
        color: 0xff0000,
        title: 'Mr. White a échoué !',
        description: `**${result.player.username}** a tenté de deviner le mot des civils mais s'est trompé.`,
        fields: [
          {
            name: 'Mot deviné',
            value: result.guessedWord,
            inline: true
          },
          {
            name: 'Mot correct',
            value: result.actualWord,
            inline: true
          }
        ],
        timestamp: new Date(),
        footer: {
          text: 'Undercover Game | Dev by Samzerrr'
        }
      };
      
      await interaction.followUp({ embeds: [failEmbed] });
      
      // Vérifier si cette élimination entraîne une victoire
      if (game.checkWin()) {
        await interaction.followUp(game.getWinMessage());
        GameManager.endGame(interaction.channelId);
      }
    }
  },
}; 