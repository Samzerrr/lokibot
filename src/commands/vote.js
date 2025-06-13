const { SlashCommandBuilder } = require('discord.js');
const { GameManager } = require('../game/GameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Votez pour éliminer un joueur')
    .addUserOption(option =>
      option.setName('joueur')
        .setDescription('Le joueur à éliminer')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option')
        .setDescription('Option de vote (blanc)')
        .setRequired(false)
        .addChoices(
          { name: 'Vote blanc', value: 'blanc' }
        )
    ),
  async execute(interaction) {
    const game = GameManager.getGame(interaction.channelId);
    if (!game || !game.isStarted) {
      await interaction.reply({ content: 'Aucune partie en cours dans ce salon.', ephemeral: true });
      return;
    }
    
    // Vérifier si c'est la phase de vote
    if (game.turnPhase !== 'VOTE') {
      await interaction.reply({ 
        content: "Ce n'est pas le moment de voter. Attendez que tous les joueurs aient soumis leur mot.", 
        ephemeral: true 
      });
      return;
    }
    
    const voterId = interaction.user.id;
    const target = interaction.options.getUser('joueur');
    const option = interaction.options.getString('option');
    
    // Vérifier si l'utilisateur vote blanc
    if (option === 'blanc') {
      const result = game.voteBlank(voterId);
      
      if (result.error) {
        await interaction.reply({ content: result.error, ephemeral: true });
        return;
      }
      
      await interaction.reply({ content: `Votre vote blanc a été pris en compte.`, ephemeral: true });
    } else if (target) {
      // Vote normal contre un joueur
      const result = game.vote(voterId, target.id);
      
      if (result.error) {
        await interaction.reply({ content: result.error, ephemeral: true });
        return;
      }
      
      await interaction.reply({ content: `Votre vote contre ${target.username} a été pris en compte.`, ephemeral: true });
    } else {
      // Ni joueur ni option spécifiée
      await interaction.reply({ 
        content: "Vous devez spécifier un joueur à éliminer ou choisir l'option 'Vote blanc'.", 
        ephemeral: true 
      });
      return;
    }
    
    // Créer un embed pour l'état actuel des votes
    const votesEmbed = {
      color: 0x0099ff,
      title: `État des votes - Tour ${game.currentTurn}/${game.maxTurns}`,
      description: game.getVotesSummary(),
      fields: [
        {
          name: 'Progression',
          value: `${Object.keys(game.votes).length}/${game.players.filter(p => p.alive).length} joueurs ont voté`
        }
      ],
      timestamp: new Date(),
      footer: {
        text: 'Undercover Game | Dev by Samzerrr'
      }
    };
    
    await interaction.followUp({ embeds: [votesEmbed] });
    
    if (game.isVotingComplete()) {
      const eliminated = game.eliminatePlayer();
      
      // Créer un embed pour l'élimination
      const eliminationEmbed = {
        color: 0xff0000,
        title: `Élimination - Tour ${game.currentTurn}/${game.maxTurns}`,
        description: eliminated ? 
          `Le joueur éliminé est : **${eliminated.username}**\nRôle : **${game.roles[eliminated.id]}**` :
          `Personne n'a été éliminé ce tour-ci (égalité ou trop de votes blancs).`,
        timestamp: new Date(),
        footer: {
          text: 'Undercover Game | Dev by Samzerrr'
        }
      };
      
      await interaction.followUp({ embeds: [eliminationEmbed] });
      
      if (game.checkWin()) {
        // Créer un embed pour la fin de la partie
        const winEmbed = {
          color: 0x00ff00,
          title: 'Fin de la partie',
          description: game.getWinMessage(),
          fields: [
            {
              name: 'Mot Civil',
              value: game.wordCommon,
              inline: true
            },
            {
              name: 'Mot Undercover',
              value: game.wordUndercover,
              inline: true
            }
          ],
          timestamp: new Date(),
          footer: {
            text: 'Undercover Game | Dev by Samzerrr'
          }
        };
        
        await interaction.followUp({ embeds: [winEmbed] });
        GameManager.endGame(interaction.channelId);
      } else {
        // Préparer le tour suivant
        const nextTurnResult = game.prepareNextTurn();
        
        if (nextTurnResult.isGameComplete) {
          // Créer un embed pour la fin de la partie (nombre de tours atteint)
          const gameCompleteEmbed = {
            color: 0x00ff00,
            title: 'Fin de la partie - Nombre de tours maximum atteint',
            description: 'La partie est terminée car le nombre maximum de tours a été atteint.',
            fields: [
              {
                name: 'Rôles restants',
                value: game.getRolesReveal()
              }
            ],
            timestamp: new Date(),
            footer: {
              text: 'Undercover Game | Dev by Samzerrr'
            }
          };
          
          await interaction.followUp({ embeds: [gameCompleteEmbed] });
          GameManager.endGame(interaction.channelId);
        } else {
          // Créer un embed pour le nouveau tour
          const newTurnEmbed = {
            color: 0x0099ff,
            title: `Nouveau tour - ${nextTurnResult.turnNumber}/${game.maxTurns}`,
            description: 'Un nouveau tour commence. Chaque joueur doit soumettre un mot.',
            fields: [
              {
                name: 'Premier joueur',
                value: `<@${nextTurnResult.currentPlayer.id}>`
              }
            ],
            timestamp: new Date(),
            footer: {
              text: 'Undercover Game | Dev by Samzerrr'
            }
          };
          
          await interaction.followUp({ embeds: [newTurnEmbed] });
          await interaction.followUp(`C'est au tour de <@${nextTurnResult.currentPlayer.id}> de soumettre un mot avec la commande \`/word\`.`);
        }
      }
    } else {
      // Indiquer combien de votes il manque
      const votesNeeded = game.players.filter(p => p.alive).length - Object.keys(game.votes).length;
      await interaction.followUp(`🗳️ Vote enregistré. **Il manque encore ${votesNeeded} vote(s).**`);
    }
  },
}; 