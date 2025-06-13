const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles'),
  async execute(interaction) {
    // Créer un embed pour l'aide
    const embed = {
      color: 0x0099ff,
      title: '📚 Aide - Commandes disponibles',
      description: 'Voici la liste des commandes disponibles sur le bot Loki :',
      fields: [
        {
          name: '🚢 Bataille Navale',
          value: '`/battleship start` - Démarre une nouvelle partie\n' +
                 '`/battleship join` - Rejoindre une partie existante\n' +
                 '`/battleship rules` - Afficher les règles du jeu\n' +
                 '`/battleship cancel` - Annuler une partie en cours\n' +
                 '`/ship place` - Placer un navire sur votre grille\n' +
                 '`/ship ready` - Se déclarer prêt à commencer\n' +
                 '`/ship view` - Voir votre grille de jeu\n' +
                 '`/fire` - Tirer sur une case de la grille adverse'
        },
        {
          name: '🕵️ Undercover',
          value: '`/startgame` - Lancer une partie d\'Undercover\n' +
                 '`/word` - Soumettre un mot pour le tour actuel\n' +
                 '`/vote` - Voter pour éliminer un joueur suspect\n' +
                 '`/guess` - Deviner le mot des civils (pour Mr. White)'
        },
        {
          name: '🔫 Roulette Russe',
          value: '`/roulette` - Lancer une partie de roulette russe\n' +
                 'Un jeu de chance où les joueurs tirent à tour de rôle avec un revolver à 6 chambres.\n' +
                 'Rejoignez la partie puis appuyez sur la gâchette quand c\'est votre tour.\n' +
                 'Le dernier joueur en vie remporte la partie!'
        },
        {
          name: '📊 Classement',
          value: '`/leaderboard global` - Afficher le classement global\n' +
                 '`/leaderboard points` - Afficher le classement par points\n' +
                 '`/leaderboard wins` - Afficher le classement par victoires\n' +
                 '`/leaderboard battleship` - Afficher le classement Bataille Navale\n' +
                 '`/leaderboard undercover` - Afficher le classement Undercover\n' +
                 '`/leaderboard player` - Afficher les statistiques d\'un joueur'
        },
        {
          name: '⚙️ Options de jeu',
          value: '**Undercover** :\n' +
                 '`/startgame undercover:2` - Définir le nombre d\'Undercover (1-3)\n' +
                 '`/startgame mrwhite:1` - Activer le rôle Mr White\n' +
                 '`/startgame temps:30` - Définir le temps d\'attente (secondes)\n' +
                 '`/startgame tours:5` - Définir le nombre de tours'
        }
      ],
      timestamp: new Date(),
      footer: {
        text: 'Bot Loki | Dev by Samzerrr'
      }
    };

    await interaction.reply({ embeds: [embed] });
  },
}; 