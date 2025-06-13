const fs = require('fs');
const path = require('path');

class Leaderboard {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.filePath = path.join(this.dataPath, 'leaderboard.json');
    this.data = {
      players: {},
      games: {
        battleship: {},
        undercover: {}
      }
    };
    this.loadData();
  }

  // Charger les données depuis le fichier JSON
  loadData() {
    try {
      // Créer le dossier data s'il n'existe pas
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }
      
      // Vérifier si le fichier existe, sinon le créer
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath);
        this.data = JSON.parse(rawData);
        console.log('Données du leaderboard chargées avec succès.');
      } else {
        // Créer un fichier vide avec la structure de base
        this.saveData();
        console.log('Fichier de leaderboard créé.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données du leaderboard:', error);
    }
  }

  // Sauvegarder les données dans le fichier JSON
  saveData() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      console.log('Données du leaderboard sauvegardées.');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données du leaderboard:', error);
    }
  }

  // Ajouter des points à un joueur (jeu générique)
  addPoints(userId, username, points) {
    if (!this.data.players[userId]) {
      this.data.players[userId] = {
        id: userId,
        username: username,
        totalPoints: 0,
        wins: 0,
        games: 0
      };
    }
    
    // Mettre à jour le nom d'utilisateur (au cas où il a changé)
    this.data.players[userId].username = username;
    
    // Ajouter les points
    this.data.players[userId].totalPoints += points;
    
    // Sauvegarder les changements
    this.saveData();
  }

  // Enregistrer une victoire pour un joueur
  addWin(userId, username, gameType) {
    if (!this.data.players[userId]) {
      this.data.players[userId] = {
        id: userId,
        username: username,
        totalPoints: 0,
        wins: 0,
        games: 0
      };
    }
    
    // Mettre à jour le nom d'utilisateur
    this.data.players[userId].username = username;
    
    // Incrémenter le nombre de victoires
    this.data.players[userId].wins += 1;
    
    // Incrémenter le nombre de parties jouées
    this.data.players[userId].games += 1;
    
    // Ajouter des statistiques spécifiques au jeu
    if (!this.data.games[gameType][userId]) {
      this.data.games[gameType][userId] = { wins: 0, games: 0 };
    }
    this.data.games[gameType][userId].wins += 1;
    this.data.games[gameType][userId].games += 1;
    
    // Sauvegarder les changements
    this.saveData();
  }

  // Enregistrer une partie jouée (sans victoire)
  addGame(userId, username, gameType) {
    if (!this.data.players[userId]) {
      this.data.players[userId] = {
        id: userId,
        username: username,
        totalPoints: 0,
        wins: 0,
        games: 0
      };
    }
    
    // Mettre à jour le nom d'utilisateur
    this.data.players[userId].username = username;
    
    // Incrémenter le nombre de parties jouées
    this.data.players[userId].games += 1;
    
    // Ajouter des statistiques spécifiques au jeu
    if (!this.data.games[gameType][userId]) {
      this.data.games[gameType][userId] = { wins: 0, games: 0 };
    }
    this.data.games[gameType][userId].games += 1;
    
    // Sauvegarder les changements
    this.saveData();
  }

  // Obtenir le top X des joueurs par points
  getTopPlayers(limit = 10) {
    const players = Object.values(this.data.players);
    
    // Trier par nombre de points (décroissant)
    return players
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }

  // Obtenir le top X des joueurs par victoires
  getTopWinners(limit = 10) {
    const players = Object.values(this.data.players);
    
    // Trier par nombre de victoires (décroissant)
    return players
      .sort((a, b) => b.wins - a.wins)
      .slice(0, limit);
  }

  // Obtenir le classement pour un jeu spécifique
  getGameLeaderboard(gameType, limit = 10) {
    if (!this.data.games[gameType]) {
      return [];
    }
    
    // Convertir les données du jeu en tableau d'objets
    const players = Object.entries(this.data.games[gameType]).map(([userId, stats]) => {
      return {
        id: userId,
        username: this.data.players[userId]?.username || 'Joueur inconnu',
        wins: stats.wins,
        games: stats.games
      };
    });
    
    // Trier par nombre de victoires (décroissant)
    return players
      .sort((a, b) => b.wins - a.wins)
      .slice(0, limit);
  }

  // Obtenir les statistiques d'un joueur spécifique
  getPlayerStats(userId) {
    return this.data.players[userId] || null;
  }

  // Obtenir les statistiques d'un joueur pour un jeu spécifique
  getPlayerGameStats(userId, gameType) {
    if (this.data.games[gameType] && this.data.games[gameType][userId]) {
      return this.data.games[gameType][userId];
    }
    return null;
  }
}

// Singleton pour accéder au leaderboard de n'importe où
const leaderboardInstance = new Leaderboard();

module.exports = { Leaderboard: leaderboardInstance }; 