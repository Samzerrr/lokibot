const { SlashCommandBuilder } = require('discord.js');
const { GameManager } = require('../game/GameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('word')
    .setDescription('Soumet un mot pour le tour actuel')
    .addStringOption(option =>
      option.setName('mot')
        .setDescription('Le mot que vous souhaitez soumettre')
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
    
    // Vérifier si c'est la phase de soumission des mots
    if (game.turnPhase !== 'WORDS') {
      await interaction.reply({ 
        content: "Ce n'est pas le moment de soumettre un mot. Attendez le prochain tour.", 
        ephemeral: true 
      });
      return;
    }
    
    // Soumettre le mot
    const result = game.submitWord(playerId, word);
    
    if (result.error) {
      await interaction.reply({ 
        content: `${result.error} C'est au tour de ${result.currentPlayer} de jouer.`, 
        ephemeral: true 
      });
      return;
    }
    
    // Confirmer la soumission
    await interaction.reply({ 
      content: `Votre mot "${word}" a été enregistré.`, 
      ephemeral: true 
    });
    
    // Créer un embed pour le récapitulatif actuel des mots
    const currentWordsEmbed = {
      color: 0x0099ff,
      title: `Mots soumis - Tour ${game.currentTurn}/${game.maxTurns}`,
      description: game.getCurrentWordsSummary(),
      fields: [
        {
          name: 'Progression',
          value: `${game.currentPlayerIndex}/${game.turnOrder.length} joueurs ont soumis leur mot`
        }
      ],
      timestamp: new Date(),
      footer: {
        text: 'Undercover Game | Dev by Samzerrr'
      }
    };
    
    // Mettre à jour l'embed après chaque mot soumis
    await interaction.followUp({ embeds: [currentWordsEmbed] });
    
    // Si tous les joueurs ont soumis leur mot, afficher le récapitulatif complet
    if (result.isRoundComplete) {
      // Créer un embed pour le récapitulatif complet
      const completeEmbed = {
        color: 0x00ff00,
        title: `Récapitulatif des mots - Tour ${game.currentTurn}/${game.maxTurns}`,
        description: result.summary,
        timestamp: new Date(),
        footer: {
          text: 'Undercover Game | Dev by Samzerrr'
        }
      };
      
      await interaction.followUp({ 
        content: "Tous les joueurs ont soumis leur mot ! Phase de vote...", 
        embeds: [completeEmbed] 
      });
      
      // Demander aux joueurs de voter
      await interaction.followUp("Utilisez la commande `/vote @joueur` pour voter contre un joueur suspect ou `/vote blanc` pour voter blanc.");
    } else {
      // Indiquer qui est le prochain joueur et le délai
      const timeRemaining = Math.ceil((result.timeoutTimestamp - Date.now()) / 1000);
      await interaction.followUp(`⏱️ C'est maintenant au tour de <@${result.nextPlayer.id}> de soumettre un mot. **Vous avez ${timeRemaining} secondes !**`);
    }
  },
}; 