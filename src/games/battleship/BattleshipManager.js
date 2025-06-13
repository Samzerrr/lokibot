// Importation du système de leaderboard
const { Leaderboard } = require('../../leaderboard');
const { BattleshipGame } = require('./BattleshipGame');

class BattleshipManagerClass {
  constructor() {
    this.games = new Map(); // channelId -> BattleshipGame
    this.playerGameMap = new Map(); // playerId -> channelId
    this.client = null;
  }
  
  // Crée une nouvelle partie dans un canal
  createGame(channelId) {
    // Vérifier si une partie existe déjà dans ce canal
    if (this.games.has(channelId)) {
      return { 
        success: false, 
        message: 'Une partie est déjà en cours dans ce canal.' 
      };
    }
    
    const game = new BattleshipGame(channelId);
    this.games.set(channelId, game);
    
    return { 
      success: true, 
      message: 'Partie créée avec succès.'
    };
  }
  
  // Ajoute un joueur à une partie
  joinGame(channelId, playerId, playerName) {
    // Vérifier si une partie existe dans ce canal
    const game = this.games.get(channelId);
    if (!game) {
      return { 
        success: false, 
        message: 'Aucune partie en cours dans ce canal.' 
      };
    }
    
    // Vérifier si le joueur est déjà dans cette partie
    if (game.hasPlayer(playerId)) {
      return { 
        success: false, 
        message: 'Vous êtes déjà dans cette partie.' 
      };
    }
    
    // Vérifier si la partie est pleine
    if (game.getPlayersCount() >= 2) {
      return { 
        success: false, 
        message: 'La partie est déjà complète.' 
      };
    }
    
    // Ajouter le joueur à la partie
    game.addPlayer(playerId, playerName);
    this.playerGameMap.set(playerId, channelId);
    
    return { 
      success: true, 
      message: 'Vous avez rejoint la partie.',
      playersCount: game.getPlayersCount()
    };
  }
  
  // Obtient une partie par l'ID du canal
  getGame(channelId) {
    return this.games.get(channelId);
  }
  
  // Obtient une partie par l'ID du joueur
  getGameByPlayer(playerId) {
    const channelId = this.playerGameMap.get(playerId);
    if (!channelId) return null;
    
    return this.games.get(channelId);
  }
  
  // Termine une partie
  endGame(channelId) {
    const game = this.games.get(channelId);
    if (!game) return;
    
    // Si la partie est terminée avec un gagnant, mettre à jour le leaderboard
    if (game.gameState === 'FINISHED' && game.winner) {
      const winnerId = game.winner;
      const winnerName = game.players[winnerId]?.username || 'Joueur inconnu';
      
      console.log(`Mise à jour du leaderboard - Victoire de ${winnerName} (${winnerId}) en Bataille Navale`);
      
      // Ajouter la victoire et les points au gagnant
      Leaderboard.addPoints(winnerId, winnerName, 5); // 5 points pour une victoire en Bataille Navale
      Leaderboard.addWin(winnerId, winnerName, 'battleship');
      
      // Ajouter une partie jouée pour le perdant
      for (const playerId in game.players) {
        if (playerId !== winnerId) {
          const playerName = game.players[playerId]?.username || 'Joueur inconnu';
          console.log(`Mise à jour du leaderboard - Défaite de ${playerName} (${playerId}) en Bataille Navale`);
          Leaderboard.addGame(playerId, playerName, 'battleship');
        }
      }
    }
    
    // Supprimer les références des joueurs
    for (const playerId in game.players) {
      this.playerGameMap.delete(playerId);
    }
    
    // Supprimer la partie
    this.games.delete(channelId);
  }
  
  // Définit le client Discord pour toutes les parties
  setClient(client) {
    this.client = client;
  }
}

const BattleshipManager = new BattleshipManagerClass();
module.exports = { BattleshipManager }; 