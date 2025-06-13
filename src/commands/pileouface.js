const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pileouface')
    .setDescription('Lancer un pile ou face')
    .addStringOption(option =>
      option
        .setName('choix')
        .setDescription('Choisissez pile ou face')
        .setRequired(false)
        .addChoices(
          { name: 'Pile', value: 'pile' },
          { name: 'Face', value: 'face' }
        )
    )
    .addUserOption(option =>
      option
        .setName('adversaire')
        .setDescription('Jouez contre un autre utilisateur')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Différer la réponse immédiatement pour éviter les erreurs de timeout
    await interaction.deferReply();

    // Récupérer le choix de l'utilisateur et l'adversaire potentiel
    const userChoice = interaction.options.getString('choix');
    const opponent = interaction.options.getUser('adversaire');
    
    // Si l'utilisateur a spécifié un adversaire, mais pas de choix
    if (opponent && !userChoice) {
      // Créer l'embed pour le défi
      const challengeEmbed = new EmbedBuilder()
        .setTitle('🪙 Défi de Pile ou Face')
        .setDescription(`<@${interaction.user.id}> défie <@${opponent.id}> à un pile ou face!`)
        .setColor('#1E90FF')
        .addFields(
          { name: 'Comment jouer', value: 'L\'adversaire doit choisir pile ou face. Le résultat sera ensuite révélé.' }
        )
        .setTimestamp();

      // Créer les boutons pour le choix de l'adversaire
      const pileButton = new ButtonBuilder()
        .setCustomId(`pileouface_choice_pile_${interaction.user.id}_${opponent.id}`)
        .setLabel('Pile')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🪙');

      const faceButton = new ButtonBuilder()
        .setCustomId(`pileouface_choice_face_${interaction.user.id}_${opponent.id}`)
        .setLabel('Face')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🪙');
        
      const refuseButton = new ButtonBuilder()
        .setCustomId(`pileouface_refuse_${interaction.user.id}_${opponent.id}`)
        .setLabel('Refuser')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const row = new ActionRowBuilder().addComponents(pileButton, faceButton, refuseButton);

      // Envoyer le défi
      await interaction.editReply({
        embeds: [challengeEmbed],
        components: [row]
      });
      return;
    }
    
    // Déterminer le résultat du pile ou face (50% de chance pour chaque)
    const result = Math.random() < 0.5 ? 'pile' : 'face';
    
    // Créer l'embed pour le résultat
    const embed = new EmbedBuilder()
      .setTitle('🪙 Pile ou Face')
      .setColor(result === 'pile' ? '#FFD700' : '#C0C0C0')
      .setThumbnail(result === 'pile' ? 'https://i.imgur.com/bFo3sBR.png' : 'https://i.imgur.com/9vYolYp.png')
      .setTimestamp();

    // Si l'utilisateur a fait un choix, déterminer s'il a gagné
    if (userChoice) {
      const hasWon = userChoice === result;
      
      embed.setDescription(`La pièce tombe sur... **${result.toUpperCase()}**!`)
        .addFields(
          { name: 'Votre choix', value: userChoice.toUpperCase(), inline: true },
          { name: 'Résultat', value: result.toUpperCase(), inline: true },
          { name: 'Résultat', value: hasWon ? '✅ Vous avez gagné!' : '❌ Vous avez perdu!', inline: false }
        );
    } else {
      // Si l'utilisateur n'a pas fait de choix, afficher simplement le résultat
      embed.setDescription(`La pièce tombe sur... **${result.toUpperCase()}**!`);
    }

    // Créer un bouton pour rejouer
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

    // Envoyer le résultat
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },
}; 