const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction } = require('discord.js');

module.exports = {
  prefix: ['pileouface_replay', 'pileouface_challenge', 'pileouface_choice', 'pileouface_refuse'],
  
  async execute(interaction, client) {
    // Différer la réponse immédiatement pour éviter les erreurs de timeout
    await interaction.deferUpdate().catch(error => {
      console.error("Erreur lors du deferUpdate:", error);
    });

    const buttonId = interaction.customId;

    // Gestion du bouton de relance simple
    if (buttonId === 'pileouface_replay') {
      await handleReplay(interaction);
      return;
    }
    
    // Gestion du bouton pour défier quelqu'un
    if (buttonId === 'pileouface_challenge') {
      await handleChallenge(interaction);
      return;
    }
    
    // Gestion du bouton pour refuser un défi
    if (buttonId.startsWith('pileouface_refuse_')) {
      await handleRefuse(interaction, buttonId);
      return;
    }
    
    // Gestion des boutons de choix (pile/face) pour un défi
    if (buttonId.startsWith('pileouface_choice_')) {
      await handleChoice(interaction, buttonId);
      return;
    }
  }
};

// Fonction pour gérer le rejeu simple
async function handleReplay(interaction) {
  // Déterminer le résultat du pile ou face (50% de chance pour chaque)
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  
  // Créer l'embed pour le résultat
  const embed = new EmbedBuilder()
    .setTitle('🪙 Pile ou Face')
    .setDescription(`La pièce tombe sur... **${result.toUpperCase()}**!`)
    .setColor(result === 'pile' ? '#FFD700' : '#C0C0C0')
    .setThumbnail(result === 'pile' ? 'https://i.imgur.com/bFo3sBR.png' : 'https://i.imgur.com/9vYolYp.png')
    .setTimestamp();

  // Créer un bouton pour rejouer et un bouton pour défier
  const replayButton = new ButtonBuilder()
    .setCustomId('pileouface_replay')
    .setLabel('Rejouer')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🪙');
    
  const challengeButton = new ButtonBuilder()
    .setCustomId('pileouface_challenge')
    .setLabel('Défier quelqu\'un')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⚔️');

  const row = new ActionRowBuilder().addComponents(replayButton, challengeButton);

  // Mettre à jour le message
  await interaction.editReply({
    embeds: [embed],
    components: [row]
  }).catch(error => {
    console.error("Erreur lors de l'editReply:", error);
  });
}

// Fonction pour gérer la création d'un défi
async function handleChallenge(interaction) {
  // Créer un select menu pour choisir l'adversaire
  const userSelect = new UserSelectMenuBuilder()
    .setCustomId('pileouface_select_opponent')
    .setPlaceholder('Sélectionnez votre adversaire')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(userSelect);

  // Créer l'embed pour la sélection d'adversaire
  const embed = new EmbedBuilder()
    .setTitle('🪙 Défi de Pile ou Face')
    .setDescription('Sélectionnez un adversaire à défier!')
    .setColor('#1E90FF')
    .setTimestamp();

  // Mettre à jour le message
  await interaction.editReply({
    embeds: [embed],
    components: [row]
  }).catch(error => {
    console.error("Erreur lors de l'editReply:", error);
  });
  
  // Configurer un collecteur pour la sélection de l'utilisateur
  const filter = i => i.customId === 'pileouface_select_opponent' && i.user.id === interaction.user.id;
  const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });
  
  collector.on('collect', async (selectInteraction) => {
    await selectInteraction.deferUpdate();
    const selectedUser = selectInteraction.values[0];
    
    // Créer l'embed pour le défi
    const challengeEmbed = new EmbedBuilder()
      .setTitle('🪙 Défi de Pile ou Face')
      .setDescription(`<@${interaction.user.id}> défie <@${selectedUser}> à un pile ou face!`)
      .setColor('#1E90FF')
      .addFields(
        { name: 'Comment jouer', value: 'L\'adversaire doit choisir pile ou face. Le résultat sera ensuite révélé.' }
      )
      .setTimestamp();

    // Créer les boutons pour le choix de l'adversaire
    const pileButton = new ButtonBuilder()
      .setCustomId(`pileouface_choice_pile_${interaction.user.id}_${selectedUser}`)
      .setLabel('Pile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🪙');

    const faceButton = new ButtonBuilder()
      .setCustomId(`pileouface_choice_face_${interaction.user.id}_${selectedUser}`)
      .setLabel('Face')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🪙');
      
    const refuseButton = new ButtonBuilder()
      .setCustomId(`pileouface_refuse_${interaction.user.id}_${selectedUser}`)
      .setLabel('Refuser')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const buttonRow = new ActionRowBuilder().addComponents(pileButton, faceButton, refuseButton);

    // Mettre à jour le message avec le défi
    await interaction.editReply({
      embeds: [challengeEmbed],
      components: [buttonRow]
    });
    
    collector.stop();
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      // Si l'utilisateur n'a pas sélectionné d'adversaire dans le temps imparti
      const timeoutEmbed = new EmbedBuilder()
        .setTitle('🪙 Défi expiré')
        .setDescription('Vous n\'avez pas sélectionné d\'adversaire à temps.')
        .setColor('#FF0000')
        .setTimestamp();
        
      interaction.editReply({
        embeds: [timeoutEmbed],
        components: []
      }).catch(error => {
        console.error("Erreur lors de l'editReply (timeout):", error);
      });
    }
  });
}

// Fonction pour gérer le refus d'un défi
async function handleRefuse(interaction, buttonId) {
  // Extraire les IDs des utilisateurs
  const [, , challengerId, targetId] = buttonId.split('_');
  
  // Vérifier si c'est bien la cible qui refuse
  if (interaction.user.id !== targetId) {
    return interaction.followUp({
      content: 'Vous ne pouvez pas refuser ce défi car il ne vous est pas destiné.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp:", error);
    });
  }
  
  // Créer l'embed pour le refus
  const embed = new EmbedBuilder()
    .setTitle('🪙 Défi Refusé')
    .setDescription(`<@${targetId}> a refusé le défi de pile ou face de <@${challengerId}>!`)
    .setColor('#FF0000')
    .setTimestamp();
    
  // Créer un bouton pour relancer un défi
  const replayButton = new ButtonBuilder()
    .setCustomId('pileouface_replay')
    .setLabel('Nouveau pile ou face')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🪙');

  const row = new ActionRowBuilder().addComponents(replayButton);

  // Mettre à jour le message
  await interaction.editReply({
    embeds: [embed],
    components: [row]
  }).catch(error => {
    console.error("Erreur lors de l'editReply:", error);
  });
}

// Fonction pour gérer les choix (pile/face) d'un défi
async function handleChoice(interaction, buttonId) {
  // Extraire les informations du bouton
  // Format: pileouface_choice_[choix]_[challengerId]_[targetId]
  const parts = buttonId.split('_');
  const choice = parts[2]; // pile ou face
  const challengerId = parts[3];
  const targetId = parts[4];
  
  // Vérifier si c'est bien la cible qui fait le choix
  if (interaction.user.id !== targetId) {
    return interaction.followUp({
      content: 'Vous ne pouvez pas faire ce choix car le défi ne vous est pas destiné.',
      ephemeral: true
    }).catch(error => {
      console.error("Erreur lors du followUp:", error);
    });
  }
  
  // Déterminer le résultat du pile ou face
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const hasWon = choice === result;
  
  // Créer l'embed pour le résultat
  const embed = new EmbedBuilder()
    .setTitle('🪙 Résultat du Défi')
    .setDescription(`La pièce tombe sur... **${result.toUpperCase()}**!`)
    .setColor(result === 'pile' ? '#FFD700' : '#C0C0C0')
    .setThumbnail(result === 'pile' ? 'https://i.imgur.com/bFo3sBR.png' : 'https://i.imgur.com/9vYolYp.png')
    .addFields(
      { name: 'Choix de ' + interaction.user.username, value: choice.toUpperCase(), inline: true },
      { name: 'Résultat', value: result.toUpperCase(), inline: true },
      { name: 'Gagnant', value: hasWon ? `<@${targetId}> remporte le défi! 🏆` : `<@${challengerId}> remporte le défi! 🏆`, inline: false }
    )
    .setTimestamp();
    
  // Créer les boutons pour rejouer ou lancer un nouveau défi
  const replayButton = new ButtonBuilder()
    .setCustomId('pileouface_replay')
    .setLabel('Nouveau pile ou face')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🪙');
    
  const revengeButton = new ButtonBuilder()
    .setCustomId(`pileouface_choice_revenge_${targetId}_${challengerId}`)
    .setLabel('Revanche')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('⚔️');

  const row = new ActionRowBuilder().addComponents(replayButton, revengeButton);

  // Mettre à jour le message
  await interaction.editReply({
    embeds: [embed],
    components: [row]
  }).catch(error => {
    console.error("Erreur lors de l'editReply:", error);
  });
} 