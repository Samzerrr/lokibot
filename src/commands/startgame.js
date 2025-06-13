const { SlashCommandBuilder } = require('discord.js');
const { GameManager } = require('../game/GameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startgame')
    .setDescription('Lance une partie d\'Undercover !')
    .addIntegerOption(option =>
      option.setName('undercover')
        .setDescription('Nombre d\'Undercover dans la partie')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(3)
    )
    .addIntegerOption(option =>
      option.setName('mrwhite')
        .setDescription('Activer le rôle Mr White (1 = oui, 0 = non)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('temps')
        .setDescription('Temps d\'attente pour les joueurs (en secondes)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('tours')
        .setDescription('Nombre de tours pour la partie')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),
  async execute(interaction, client) {
    const undercoverCount = interaction.options.getInteger('undercover') || 1; // Par défaut 1 undercover
    const mrWhiteEnabled = interaction.options.getInteger('mrwhite') === 1;
    const waitTime = interaction.options.getInteger('temps') || 10; // Par défaut 10 secondes
    const maxTurns = interaction.options.getInteger('tours') || 3; // Par défaut 3 tours
    
    const game = GameManager.createGame(interaction.channelId, mrWhiteEnabled, maxTurns, undercoverCount);
    
    await interaction.reply({ content: `Une partie commence ! Cliquez sur ✅ pour rejoindre (${waitTime} secondes)...`, fetchReply: true });
    const message = await interaction.fetchReply();
    await message.react('✅');
    
    console.log(`Démarrage d'une partie dans le canal ${interaction.channelId}`);
    console.log(`Temps d'attente: ${waitTime} secondes, Nombre de tours: ${maxTurns}, Nombre d'undercover: ${undercoverCount}`);

    // Ajout du créateur de la partie
    game.addPlayer(interaction.user.id, interaction.user.username);

    // Collecte des joueurs
    const filter = (reaction, user) => reaction.emoji.name === '✅' && !user.bot;
    const collector = message.createReactionCollector({ filter, time: waitTime * 1000 });
    
    collector.on('collect', (reaction, user) => {
      console.log(`Réaction reçue de ${user.username} (${user.id})`);
      game.addPlayer(user.id, user.username);
    });
    
    collector.on('end', async collected => {
      console.log(`Fin de la collecte des réactions. ${collected.size} réactions collectées.`);
      console.log(`Nombre de joueurs: ${game.players.length}`);
      
      // Liste des joueurs
      let playersList = "Joueurs dans la partie:\n";
      game.players.forEach(p => {
        playersList += `- ${p.username} (${p.id})\n`;
      });
      console.log(playersList);
      await interaction.followUp(playersList);
      
      // Démarrage de la partie
      const rolesAssigned = game.assignRoles();
      if (!rolesAssigned) {
        await interaction.followUp('Erreur lors de l\'attribution des rôles. La partie est annulée.');
        GameManager.endGame(interaction.channelId);
        return;
      }
      
      // Définir le client Discord pour les notifications
      game.setClient(client);
      
      // Envoi des rôles aux joueurs
      console.log("Envoi des rôles aux joueurs...");
      await game.sendRoles(client);
      
      // Démarrer le premier tour
      const firstTurn = game.startNewTurn();
      
      // Créer un embed pour le début de la partie
      const embed = {
        color: 0x0099ff,
        title: `Début de la partie - ${maxTurns} tours`,
        description: `La partie commence avec ${game.players.length} joueurs.\n\nChaque joueur va devoir soumettre un mot en rapport avec son mot secret à chaque tour.\n\nAprès chaque tour, vous voterez pour éliminer un joueur suspect.`,
        fields: [
          {
            name: 'Tour actuel',
            value: `1/${maxTurns}`,
            inline: true
          },
          {
            name: 'Premier joueur',
            value: `<@${firstTurn.currentPlayer.id}>`,
            inline: true
          },
          {
            name: '⏱️ Temps limite',
            value: `${game.wordTimeoutSeconds} secondes par joueur`,
            inline: true
          },
          {
            name: '📜 Règles du jeu',
            value: `**Civils** : Découvrez qui a un mot différent et éliminez les imposteurs.\n**Undercover** (${game.undercoverCount}) : Faites-vous passer pour un civil et survivez.\n**Mr. White** (${mrWhiteEnabled ? "activé" : "désactivé"}) : Devinez le mot des civils avec \`/guess\` ou survivez.`
          },
          {
            name: '🏆 Points',
            value: `**Civils** : 2 points chacun\n**Undercover** : 10 points\n**Mr. White** : 6 points`
          }
        ],
        timestamp: new Date(),
        footer: {
          text: 'Undercover Game | Dev by Samzerrr'
        }
      };
      
      await interaction.followUp({ 
        content: 'La partie commence !', 
        embeds: [embed] 
      });
      
      await interaction.followUp(`⏱️ C'est au tour de <@${firstTurn.currentPlayer.id}> de soumettre un mot avec la commande \`/word\`. **Vous avez ${game.wordTimeoutSeconds} secondes !**`);
    });
  },
}; 