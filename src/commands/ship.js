const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BattleshipManager } = require('../games/battleship/BattleshipManager');
const { BattleshipButtons } = require('../games/battleship/BattleshipButtons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Commandes pour gérer vos navires dans une partie de Bataille Navale')
    .addSubcommand(subcommand =>
      subcommand
        .setName('place')
        .setDescription('Place un navire sur votre grille')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type de navire à placer')
            .setRequired(false)
            .addChoices(
              { name: 'Porte-avions (5 cases)', value: 'carrier' },
              { name: 'Cuirassé (4 cases)', value: 'battleship' },
              { name: 'Croiseur (3 cases)', value: 'cruiser' },
              { name: 'Sous-marin (3 cases)', value: 'submarine' },
              { name: 'Contre-torpilleur (2 cases)', value: 'destroyer' }
            )
        )
        .addStringOption(option =>
          option.setName('position')
            .setDescription('Position de départ (ex: A0)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('orientation')
            .setDescription('Orientation du navire')
            .setRequired(false)
            .addChoices(
              { name: 'Horizontal', value: 'horizontal' },
              { name: 'Vertical', value: 'vertical' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ready')
        .setDescription('Indique que vous êtes prêt à commencer la partie')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Affiche votre grille et vos navires')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    // Récupérer la partie du joueur
    const game = BattleshipManager.getGameByPlayer(interaction.user.id);
    
    if (!game) {
      await interaction.reply({ content: 'Vous n\'êtes pas dans une partie de Bataille Navale.', ephemeral: true });
      return;
    }
    
    if (subcommand === 'place') {
      // Vérifier si la partie est en phase de préparation
      if (game.gameState !== 'SETUP') {
        await interaction.reply({ content: 'La partie a déjà commencé, vous ne pouvez plus placer de navires.', ephemeral: true });
        return;
      }
      
      // Vérifier si le joueur est déjà prêt
      const player = game.getPlayer(interaction.user.id);
      if (player.ready) {
        await interaction.reply({ content: 'Vous êtes déjà prêt, vous ne pouvez plus placer de navires.', ephemeral: true });
        return;
      }
      
      // Récupérer les paramètres
      const shipType = interaction.options.getString('type');
      const position = interaction.options.getString('position');
      const orientation = interaction.options.getString('orientation');
      
      // Si aucun paramètre n'est fourni, afficher l'interface avec boutons
      if (!shipType && !position && !orientation) {
        // Récupérer les navires restants à placer
        const remainingShips = game.getRemainingShips(interaction.user.id);
        
        // Créer un embed pour afficher la grille du joueur
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🚢 Placement des navires')
          .setDescription('Sélectionnez un navire à placer sur votre grille.')
          .addFields(
            {
              name: 'Votre grille',
              value: `\`\`\`\n${game.getPlayerBoard(interaction.user.id, true)}\`\`\``
            },
            {
              name: 'Navires restants à placer',
              value: formatRemainingShips(remainingShips)
            }
          )
          .setTimestamp()
          .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
        
        // Créer les boutons pour la sélection des navires
        const components = BattleshipButtons.createShipSelectionButtons(remainingShips);
        
        await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
        return;
      }
      
      // Placement manuel (via paramètres)
      if (!shipType || !position || !orientation) {
        await interaction.reply({ 
          content: 'Vous devez spécifier le type de navire, la position et l\'orientation, ou ne spécifier aucun paramètre pour utiliser l\'interface interactive.', 
          ephemeral: true 
        });
        return;
      }
      
      // Valider la position
      if (!/^[A-J][0-9]$/.test(position.toUpperCase())) {
        await interaction.reply({ content: 'Position invalide. Utilisez une lettre (A-J) suivie d\'un chiffre (0-9).', ephemeral: true });
        return;
      }
      
      // Convertir la position en coordonnées
      const col = position.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      const row = parseInt(position.charAt(1));
      
      // Placer le navire
      const result = game.placeShip(
        interaction.user.id,
        shipType,
        row,
        col,
        orientation === 'vertical'
      );
      
      if (!result.success) {
        await interaction.reply({ content: result.message, ephemeral: true });
        return;
      }
      
      // Créer un embed pour afficher la grille du joueur
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🚢 Placement des navires')
        .setDescription(result.message)
        .addFields(
          {
            name: 'Votre grille',
            value: `\`\`\`\n${game.getPlayerBoard(interaction.user.id, true)}\`\`\``
          },
          {
            name: 'Navires restants à placer',
            value: formatRemainingShips(result.remainingShips)
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (subcommand === 'ready') {
      // Vérifier si la partie est en phase de préparation
      if (game.gameState !== 'SETUP') {
        await interaction.reply({ content: 'La partie a déjà commencé.', ephemeral: true });
        return;
      }
      
      // Se déclarer prêt
      const result = game.setPlayerReady(interaction.user.id);
      
      if (!result.success) {
        await interaction.reply({ content: result.message, ephemeral: true });
        return;
      }
      
      await interaction.reply({ content: result.message, ephemeral: true });
      
      // Vérifier si la partie peut commencer
      if (game.isReadyToStart()) {
        const startResult = game.start();
        
        if (startResult.success) {
          // Créer un embed pour le début de la partie
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🚢 La partie commence !')
            .setDescription(`La partie de Bataille Navale commence ! C'est au tour de **${startResult.currentPlayer}** de jouer.\n\nUtilisez la commande \`/fire\` pour tirer sur une case de la grille adverse.`)
            .setTimestamp()
            .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
          
          const channel = await client.channels.fetch(game.channelId);
          await channel.send({ embeds: [embed] });
        }
      } else {
        // Annoncer au canal que le joueur est prêt
        const channel = await client.channels.fetch(game.channelId);
        await channel.send(`**${interaction.user.username}** est prêt ! En attente que l'autre joueur soit prêt...`);
      }
      
    } else if (subcommand === 'view') {
      // Afficher la grille du joueur
      const boardDisplay = game.getPlayerBoard(interaction.user.id, true);
      
      // Créer un embed pour afficher la grille
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🚢 Votre grille')
        .setDescription(`\`\`\`\n${boardDisplay}\`\`\``)
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

// Fonction pour formater l'affichage des navires restants
function formatRemainingShips(remainingShips) {
  let result = '';
  
  for (const [type, info] of Object.entries(remainingShips)) {
    if (info.remaining > 0) {
      result += `- ${info.name} (${info.size} cases) : ${info.remaining}\n`;
    }
  }
  
  if (result === '') {
    result = 'Tous les navires ont été placés ! Utilisez `/ship ready` pour vous déclarer prêt.';
  }
  
  return result;
} 