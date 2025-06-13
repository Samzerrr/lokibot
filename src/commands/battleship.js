const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BattleshipManager } = require('../games/battleship/BattleshipManager');
const { BattleshipButtons } = require('../games/battleship/BattleshipButtons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('battleship')
    .setDescription('Commandes pour le jeu de Bataille Navale')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Démarre une nouvelle partie de Bataille Navale')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Rejoindre une partie de Bataille Navale')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rules')
        .setDescription('Affiche les règles du jeu de Bataille Navale')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Annule la partie de Bataille Navale en cours')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    // Définir le client Discord pour toutes les parties
    BattleshipManager.setClient(client);
    
    if (subcommand === 'start') {
      // Créer une nouvelle partie
      const result = BattleshipManager.createGame(interaction.channelId);
      
      if (!result.success) {
        await interaction.reply({ content: result.message, ephemeral: true });
        return;
      }
      
      // Ajouter le créateur à la partie
      const joinResult = BattleshipManager.joinGame(
        interaction.channelId,
        interaction.user.id,
        interaction.user.username
      );
      
      // Créer un embed pour la nouvelle partie
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🚢 Nouvelle partie de Bataille Navale')
        .setDescription('Une nouvelle partie de Bataille Navale a été créée ! Utilisez `/battleship join` pour rejoindre la partie.')
        .addFields(
          {
            name: 'Joueurs',
            value: `1/2 (${interaction.user.username})`
          },
          {
            name: 'Statut',
            value: 'En attente d\'un autre joueur'
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === 'join') {
      // Rejoindre une partie existante
      const result = BattleshipManager.joinGame(
        interaction.channelId,
        interaction.user.id,
        interaction.user.username
      );
      
      if (!result.success) {
        await interaction.reply({ content: result.message, ephemeral: true });
        return;
      }
      
      const game = BattleshipManager.getGame(interaction.channelId);
      const players = Object.values(game.players).map(p => p.username).join(', ');
      
      // Créer un embed pour rejoindre la partie
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🚢 Bataille Navale')
        .setDescription(`${interaction.user.username} a rejoint la partie !`)
        .addFields(
          {
            name: 'Joueurs',
            value: `${result.playersCount}/2 (${players})`
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [embed] });
      
      // Si la partie est complète, envoyer un message pour commencer à placer les navires
      if (result.playersCount === 2) {
        const setupEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🚢 Bataille Navale - Placement des navires')
          .setDescription('La partie est prête à commencer ! Chaque joueur doit placer ses navires.')
          .addFields(
            {
              name: 'Navires à placer',
              value: '- 1 Porte-avions (5 cases)\n- 1 Cuirassé (4 cases)\n- 1 Croiseur (3 cases)\n- 1 Sous-marin (3 cases)\n- 1 Contre-torpilleur (2 cases)'
            },
            {
              name: 'Commandes',
              value: 'Utilisez `/ship place` sans paramètres pour ouvrir l\'interface de placement interactive.'
            }
          )
          .setTimestamp()
          .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
        
        await interaction.followUp({ embeds: [setupEmbed] });
        
        // Envoyer des messages à chaque joueur avec leurs grilles (en réponse éphémère)
        for (const player of Object.values(game.players)) {
          try {
            // Si c'est le joueur actuel, on peut utiliser l'interaction existante
            if (player.id === interaction.user.id) {
              // Récupérer les navires restants à placer
              const remainingShips = game.getRemainingShips(player.id);
              
              // Créer un embed pour le joueur
              const playerEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🚢 Placement de vos navires')
                .setDescription('Sélectionnez un navire à placer sur votre grille.')
                .addFields(
                  {
                    name: 'Votre grille',
                    value: `\`\`\`\n${game.getPlayerBoard(player.id, true)}\`\`\``
                  },
                  {
                    name: 'Navires à placer',
                    value: formatRemainingShips(remainingShips)
                  }
                )
                .setTimestamp()
                .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
                
              // Créer les boutons pour la sélection des navires
              const components = BattleshipButtons.createShipSelectionButtons(remainingShips);
              
              await interaction.followUp({ embeds: [playerEmbed], components: components, ephemeral: true });
            } else {
              // Pour l'autre joueur, on envoie un message public pour l'informer
              await interaction.followUp({
                content: `${player.username}, utilisez la commande \`/ship place\` sans paramètres pour placer vos navires avec l'interface interactive.`,
                ephemeral: false
              });
            }
          } catch (error) {
            console.error(`Erreur lors de l'envoi du message à ${player.username}:`, error);
          }
        }
      }
      
    } else if (subcommand === 'rules') {
      // Afficher les règles du jeu
      const rulesEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📜 Règles de la Bataille Navale')
        .setDescription('La Bataille Navale est un jeu de stratégie pour 2 joueurs.')
        .addFields(
          {
            name: 'Objectif',
            value: 'Couler tous les navires adverses avant que l\'adversaire ne coule les vôtres.'
          },
          {
            name: 'Mise en place',
            value: 'Chaque joueur place ses navires sur sa grille 10x10 sans que l\'adversaire ne voie leur position. Les navires ne peuvent pas se toucher, même en diagonale.'
          },
          {
            name: 'Navires',
            value: '- 1 Porte-avions (5 cases)\n- 1 Cuirassé (4 cases)\n- 1 Croiseur (3 cases)\n- 1 Sous-marin (3 cases)\n- 1 Contre-torpilleur (2 cases)'
          },
          {
            name: 'Déroulement',
            value: 'À tour de rôle, les joueurs tirent sur une case de la grille adverse. Si un navire est touché, le joueur peut rejouer. La partie se termine quand tous les navires d\'un joueur sont coulés.'
          },
          {
            name: 'Commandes',
            value: '`/battleship start` - Démarrer une nouvelle partie\n`/battleship join` - Rejoindre une partie\n`/ship place` - Placer un navire avec l\'interface interactive\n`/fire` - Tirer sur une case'
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
      
      await interaction.reply({ embeds: [rulesEmbed] });
      
    } else if (subcommand === 'cancel') {
      // Annuler la partie en cours
      const game = BattleshipManager.getGame(interaction.channelId);
      
      if (!game) {
        await interaction.reply({ content: 'Aucune partie en cours dans ce canal.', ephemeral: true });
        return;
      }
      
      // Vérifier si le joueur est dans la partie
      if (!game.hasPlayer(interaction.user.id)) {
        await interaction.reply({ content: 'Vous n\'êtes pas dans cette partie.', ephemeral: true });
        return;
      }
      
      // Annuler la partie
      BattleshipManager.endGame(interaction.channelId);
      
      await interaction.reply('La partie de Bataille Navale a été annulée.');
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