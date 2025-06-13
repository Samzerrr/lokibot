const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  prefix: ['roulette_join', 'roulette_start', 'roulette_shoot'],
  
  async execute(interaction, client) {
    // Différer la réponse immédiatement pour éviter les erreurs de timeout
    await interaction.deferUpdate().catch(error => {
      console.error("Erreur lors du deferUpdate:", error);
    });

    const buttonId = interaction.customId;
    const messageId = interaction.message.id;
    const gameFile = path.join(__dirname, '..', 'games', 'roulette', `${messageId}.json`);

    // Vérifier si le fichier de jeu existe
    if (!fs.existsSync(gameFile)) {
      return await interaction.followUp({
        content: 'Cette partie n\'existe plus ou a été supprimée.',
        ephemeral: true
      }).catch(error => {
        console.error("Erreur lors du followUp (jeu inexistant):", error);
      });
    }

    // Charger les données du jeu
    const gameData = JSON.parse(fs.readFileSync(gameFile, 'utf8'));

    // Traiter les différentes interactions selon le bouton cliqué
    switch (buttonId) {
      case 'roulette_join':
        await handleJoin(interaction, gameData, gameFile);
        break;
      case 'roulette_start':
        await handleStart(interaction, gameData, gameFile);
        break;
      case 'roulette_shoot':
        await handleShoot(interaction, gameData, gameFile, client);
        break;
    }
  }
};

// Fonction pour gérer quand un joueur rejoint la partie
async function handleJoin(interaction, gameData, gameFile) {
  // Vérifier si le jeu est en attente
  if (gameData.gameState !== 'waiting') {
    return await interaction.followUp({
      content: 'Cette partie a déjà commencé. Vous ne pouvez plus la rejoindre.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (partie déjà commencée):", error);
    });
  }

  // Vérifier si le joueur est déjà dans la partie
  if (gameData.players.some(player => player.id === interaction.user.id)) {
    return await interaction.followUp({
      content: 'Vous avez déjà rejoint cette partie.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (déjà rejoint):", error);
    });
  }

  // Ajouter le joueur à la liste
  gameData.players.push({
    id: interaction.user.id,
    username: interaction.user.username,
    alive: true
  });

  // Mettre à jour l'embed avec la nouvelle liste de joueurs
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const playersList = gameData.players.map(player => `<@${player.id}>`).join('\n');
  embed.spliceFields(1, 1, { name: `Joueurs inscrits (${gameData.players.length})`, value: playersList || '⏳ En attente...' });

  // Sauvegarder les données mises à jour
  fs.writeFileSync(gameFile, JSON.stringify(gameData, null, 2));

  // Mettre à jour le message
  await interaction.editReply({ embeds: [embed], components: interaction.message.components }).catch(error => {
    console.error("Erreur lors de l'editReply:", error);
  });
  
  // Informer le joueur qu'il a rejoint
  await interaction.followUp({
    content: 'Vous avez rejoint la partie de roulette russe !',
    ephemeral: true
  }).catch(error => {
    console.error("Erreur lors du followUp (confirmation):", error);
  });
}

// Fonction pour gérer le début de la partie
async function handleStart(interaction, gameData, gameFile) {
  // Vérifier si c'est l'hôte qui démarre la partie
  if (interaction.user.id !== gameData.host && !interaction.member.permissions.has('ADMINISTRATOR')) {
    return await interaction.followUp({
      content: 'Seul l\'hôte de la partie ou un administrateur peut la démarrer.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (non autorisé):", error);
    });
  }

  // Vérifier si le jeu est déjà en cours
  if (gameData.gameState !== 'waiting') {
    return await interaction.followUp({
      content: 'Cette partie a déjà commencé.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (déjà commencé):", error);
    });
  }

  // Vérifier s'il y a au moins 2 joueurs
  if (gameData.players.length < 2) {
    return await interaction.followUp({
      content: 'Il faut au moins 2 joueurs pour commencer la partie.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (pas assez de joueurs):", error);
    });
  }

  // Démarrer la partie
  gameData.gameState = 'playing';
  gameData.currentTurn = 0;

  // Mettre à jour l'embed
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.setTitle('🔫 Roulette Russe - En cours');
  embed.setDescription(`Le jeu a commencé ! C'est au tour de <@${gameData.players[0].id}> d'appuyer sur la gâchette.`);
  embed.setFooter({ text: `Tour: 1/${gameData.players.length} | Chances: 1/${gameData.chamberCount}` });

  // Créer le bouton pour tirer
  const shootButton = new ButtonBuilder()
    .setCustomId('roulette_shoot')
    .setLabel('Appuyer sur la gâchette')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(shootButton);

  // Sauvegarder les données mises à jour
  fs.writeFileSync(gameFile, JSON.stringify(gameData, null, 2));

  // Mettre à jour le message
  await interaction.editReply({
    embeds: [embed],
    components: [row]
  }).catch(error => {
    console.error("Erreur lors de l'editReply (début de partie):", error);
  });
}

// Fonction pour gérer quand un joueur tire
async function handleShoot(interaction, gameData, gameFile, client) {
  // Vérifier si le jeu est en cours
  if (gameData.gameState !== 'playing') {
    return await interaction.followUp({
      content: 'Cette partie n\'est pas en cours.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (pas en cours):", error);
    });
  }

  // Vérifier si c'est le tour du joueur
  const currentPlayer = gameData.players[gameData.currentTurn];
  if (interaction.user.id !== currentPlayer.id) {
    return await interaction.followUp({
      content: `Ce n'est pas votre tour. C'est au tour de <@${currentPlayer.id}>.`,
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp (pas votre tour):", error);
    });
  }

  // Déterminer si le joueur est touché
  const currentPosition = (gameData.chamberCount - 1);
  const isShot = currentPosition === gameData.bulletPosition;

  // Mettre à jour l'embed
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  
  if (isShot) {
    // Le joueur est touché
    currentPlayer.alive = false;
    
    embed.setDescription(`**BANG!** <@${currentPlayer.id}> a été touché par la balle! 💀`);
    
    // Vérifier s'il reste plus d'un joueur vivant
    const alivePlayers = gameData.players.filter(player => player.alive);
    
    if (alivePlayers.length <= 1) {
      // Fin de la partie
      gameData.gameState = 'finished';
      
      const winner = alivePlayers[0];
      embed.setTitle('🔫 Roulette Russe - Terminée');
      embed.setDescription(`**BANG!** <@${currentPlayer.id}> a été touché par la balle! 💀\n\n**<@${winner.id}> a survécu et remporte la partie!** 🏆`);
      embed.setFooter({ text: 'Partie terminée' });
      
      // Supprimer les boutons
      await interaction.editReply({
        embeds: [embed],
        components: []
      }).catch(error => {
        console.error("Erreur lors de l'editReply (fin de partie):", error);
      });
    } else {
      // Passer au joueur suivant vivant
      do {
        gameData.currentTurn = (gameData.currentTurn + 1) % gameData.players.length;
      } while (!gameData.players[gameData.currentTurn].alive);
      
      // Réinitialiser le barillet
      gameData.bulletPosition = Math.floor(Math.random() * gameData.chamberCount);
      
      // Mettre à jour l'embed pour le prochain tour
      const nextPlayer = gameData.players[gameData.currentTurn];
      embed.setDescription(`**BANG!** <@${currentPlayer.id}> a été touché par la balle! 💀\n\nC'est maintenant au tour de <@${nextPlayer.id}> d'appuyer sur la gâchette.`);
      embed.setFooter({ text: `Tour: ${gameData.currentTurn + 1}/${gameData.players.length} | Chances: 1/${gameData.chamberCount}` });
      
      // Mettre à jour le message
      await interaction.editReply({ embeds: [embed] }).catch(error => {
        console.error("Erreur lors de l'editReply (joueur touché):", error);
      });
    }
  } else {
    // Le joueur a survécu
    
    // Faire tourner le barillet
    gameData.bulletPosition = Math.floor(Math.random() * gameData.chamberCount);
    
    // Passer au joueur suivant vivant
    do {
      gameData.currentTurn = (gameData.currentTurn + 1) % gameData.players.length;
    } while (!gameData.players[gameData.currentTurn].alive);
    
    // Mettre à jour l'embed pour le prochain tour
    const nextPlayer = gameData.players[gameData.currentTurn];
    embed.setDescription(`*Click!* <@${currentPlayer.id}> a survécu!\n\nC'est maintenant au tour de <@${nextPlayer.id}> d'appuyer sur la gâchette.`);
    embed.setFooter({ text: `Tour: ${gameData.currentTurn + 1}/${gameData.players.length} | Chances: 1/${gameData.chamberCount}` });
    
    // Mettre à jour le message
    await interaction.editReply({ embeds: [embed] }).catch(error => {
      console.error("Erreur lors de l'editReply (joueur survécu):", error);
    });
  }
  
  // Sauvegarder les données mises à jour
  fs.writeFileSync(gameFile, JSON.stringify(gameData, null, 2));
} 