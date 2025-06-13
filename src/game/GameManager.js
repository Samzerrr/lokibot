const { UndercoverGame } = require('./UndercoverGame');

class GameManagerClass {
  constructor() {
    this.games = new Map(); // channelId -> UndercoverGame
  }

  createGame(channelId, mrWhiteEnabled = false, maxTurns = 3, undercoverCount = 1) {
    const game = new UndercoverGame(mrWhiteEnabled, maxTurns, undercoverCount);
    game.channelId = channelId;
    this.games.set(channelId, game);
    return game;
  }

  getGame(channelId) {
    return this.games.get(channelId);
  }

  endGame(channelId) {
    this.games.delete(channelId);
  }
}

const GameManager = new GameManagerClass();
module.exports = { GameManager }; 