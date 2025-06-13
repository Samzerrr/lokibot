const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Démarrer une partie de roulette russe'),

  async execute(interaction, client) {
    // Différer la réponse immédiatement pour éviter les erreurs de timeout
    await interaction.deferReply();

    // Créer un embed pour présenter le jeu
    const embed = new EmbedBuilder()
      .setTitle('🔫 Roulette Russe')
      .setDescription('Un jeu mortel de chance où chaque joueur tente sa chance en appuyant sur la gâchette...')
      .setColor('#FF0000')
      .addFields(
        { name: 'Comment jouer', value: 'Cliquez sur "Rejoindre" pour participer. Une fois que tous les joueurs ont rejoint, cliquez sur "Commencer" pour démarrer la partie.' },
        { name: 'Joueurs inscrits', value: '⏳ En attente...' }
      )
      .setFooter({ text: 'La partie n\'a pas encore commencé' });

    // Créer les boutons
    const joinButton = new ButtonBuilder()
      .setCustomId('roulette_join')
      .setLabel('Rejoindre')
      .setStyle(ButtonStyle.Primary);

    const startButton = new ButtonBuilder()
      .setCustomId('roulette_start')
      .setLabel('Commencer')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(joinButton, startButton);

    // Envoyer le message avec les boutons
    const message = await interaction.editReply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    }).catch(error => {
      console.error("Erreur lors de l'editReply (initialisation roulette):", error);
      return null;
    });

    // Vérifier si la réponse a été reçue
    if (!message) {
      console.error("Impossible d'obtenir la réponse du message de roulette");
      return;
    }

    // Initialiser les données de jeu
    const gameData = {
      players: [],
      gameState: 'waiting',
      currentTurn: 0,
      messageId: message.id,
      channelId: interaction.channelId,
      host: interaction.user.id,
      chamberCount: 6,
      bulletPosition: Math.floor(Math.random() * 6)
    };

    // Sauvegarder les données de jeu
    const gamesDir = path.join(__dirname, '..', 'games', 'roulette');
    if (!fs.existsSync(gamesDir)) {
      fs.mkdirSync(gamesDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(gamesDir, `${message.id}.json`),
      JSON.stringify(gameData, null, 2)
    );
  },
}; 