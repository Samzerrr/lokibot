class BattleshipGame {
  constructor(channelId = null) {
    this.players = {}; // {playerId: {board, ships, shots}}
    this.size = 10; // Taille de la grille (10x10)
    this.currentPlayer = null;
    this.opponent = null;
    this.gameState = 'SETUP'; // SETUP, PLAYING, GAMEOVER
    this.winner = null;
    this.channelId = channelId;
    this.client = null;
    this.lastActionTime = Date.now();
    this.timeout = null;
    
    // Définition des navires selon les règles classiques
    this.shipTypes = {
      'carrier': { size: 5, count: 1, name: 'Porte-avions' },
      'battleship': { size: 4, count: 1, name: 'Cuirassé' },
      'cruiser': { size: 3, count: 1, name: 'Croiseur' },
      'submarine': { size: 3, count: 1, name: 'Sous-marin' },
      'destroyer': { size: 2, count: 1, name: 'Contre-torpilleur' }
    };
  }
  
  // Initialise un joueur
  initPlayer(playerId, username) {
    // Créer une grille vide
    const board = Array(this.size).fill().map(() => Array(this.size).fill(null));
    
    this.players[playerId] = {
      id: playerId,
      username: username,
      board: board,
      ships: [],
      shots: Array(this.size).fill().map(() => Array(this.size).fill(false)),
      ready: false
    };
    
    return this.players[playerId];
  }
  
  // Alias pour initPlayer pour compatibilité avec le nouveau code
  addPlayer(playerId, username) {
    return this.initPlayer(playerId, username);
  }
  
  // Obtient le nombre de joueurs dans la partie
  getPlayersCount() {
    return Object.keys(this.players).length;
  }
  
  // Définit le client Discord
  setClient(client) {
    this.client = client;
  }
  
  // Définit l'ID du canal
  setChannelId(channelId) {
    this.channelId = channelId;
  }
  
  // Vérifie si un joueur est dans la partie
  hasPlayer(playerId) {
    return !!this.players[playerId];
  }
  
  // Obtient un joueur par son ID
  getPlayer(playerId) {
    return this.players[playerId];
  }
  
  // Obtient tous les joueurs
  getPlayers() {
    return Object.values(this.players);
  }
  
  // Vérifie si la partie est pleine (2 joueurs)
  isFull() {
    return Object.keys(this.players).length >= 2;
  }
  
  // Vérifie si la partie est prête à commencer
  isReadyToStart() {
    if (Object.keys(this.players).length !== 2) return false;
    
    return Object.values(this.players).every(player => player.ready);
  }
  
  // Démarre la partie
  start() {
    if (!this.isReadyToStart()) {
      return { success: false, message: 'La partie n\'est pas prête à commencer.' };
    }
    
    const players = Object.values(this.players);
    this.currentPlayer = players[Math.floor(Math.random() * players.length)].id;
    this.opponent = players.find(p => p.id !== this.currentPlayer).id;
    this.gameState = 'PLAYING';
    this.lastActionTime = Date.now();
    
    // Démarrer le timer d'inactivité
    this.startInactivityTimer();
    
    return { 
      success: true, 
      message: 'La partie a commencé !',
      currentPlayer: this.players[this.currentPlayer].username
    };
  }
  
  // Vérifie si un navire peut être placé à une position donnée
  canPlaceShip(playerId, shipType, row, col, isVertical) {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    
    const shipInfo = this.shipTypes[shipType];
    if (!shipInfo) return false;
    
    // Vérifier si le joueur a déjà placé le nombre maximum de ce type de navire
    const existingShips = player.ships.filter(ship => ship.type === shipType);
    if (existingShips.length >= shipInfo.count) {
      return false;
    }
    
    // Vérifier si le navire dépasse de la grille
    if (isVertical) {
      if (row + shipInfo.size > this.size) return false;
    } else {
      if (col + shipInfo.size > this.size) return false;
    }
    
    // Vérifier si la position est libre (pas d'autres navires à proximité)
    for (let i = 0; i < shipInfo.size; i++) {
      const r = isVertical ? row + i : row;
      const c = isVertical ? col : col + i;
      
      // Vérifier la cellule et ses voisines
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          
          // Vérifier si la cellule est dans la grille
          if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
            if (player.board[nr][nc] !== null) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }
  
  // Place un navire sur la grille d'un joueur
  placeShip(playerId, shipType, row, col, isVertical) {
    if (!this.canPlaceShip(playerId, shipType, row, col, isVertical)) {
      return { 
        success: false, 
        message: 'Impossible de placer le navire à cette position.' 
      };
    }
    
    const player = this.getPlayer(playerId);
    const shipInfo = this.shipTypes[shipType];
    
    // Créer le navire
    const ship = {
      type: shipType,
      name: shipInfo.name,
      size: shipInfo.size,
      positions: [],
      hits: 0,
      sunk: false
    };
    
    // Placer le navire sur la grille
    for (let i = 0; i < shipInfo.size; i++) {
      const r = isVertical ? row + i : row;
      const c = isVertical ? col : col + i;
      
      player.board[r][c] = {
        shipId: player.ships.length,
        segment: i
      };
      
      ship.positions.push({ row: r, col: c });
    }
    
    // Ajouter le navire à la liste des navires du joueur
    player.ships.push(ship);
    
    return { 
      success: true, 
      message: `${shipInfo.name} placé avec succès.`,
      remainingShips: this.getRemainingShips(playerId)
    };
  }
  
  // Obtient les navires restants à placer pour un joueur
  getRemainingShips(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return {};
    
    const result = {};
    
    for (const [type, info] of Object.entries(this.shipTypes)) {
      const placedCount = player.ships.filter(ship => ship.type === type).length;
      result[type] = {
        name: info.name,
        size: info.size,
        remaining: info.count - placedCount
      };
    }
    
    return result;
  }
  
  // Marque un joueur comme prêt
  setPlayerReady(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, message: 'Joueur non trouvé.' };
    
    // Vérifier si tous les navires sont placés
    let allShipsPlaced = true;
    for (const [type, info] of Object.entries(this.shipTypes)) {
      const placedCount = player.ships.filter(ship => ship.type === type).length;
      if (placedCount < info.count) {
        allShipsPlaced = false;
        break;
      }
    }
    
    if (!allShipsPlaced) {
      return { 
        success: false, 
        message: 'Vous devez placer tous vos navires avant d\'être prêt.' 
      };
    }
    
    player.ready = true;
    
    return { 
      success: true, 
      message: 'Vous êtes prêt. En attente de l\'autre joueur...' 
    };
  }
  
  // Effectue un tir sur la grille adverse
  makeShot(playerId, row, col) {
    // Vérifier si c'est le tour du joueur
    if (playerId !== this.currentPlayer) {
      return { 
        success: false, 
        message: 'Ce n\'est pas votre tour.' 
      };
    }
    
    // Vérifier si la partie est en cours
    if (this.gameState !== 'PLAYING') {
      return { 
        success: false, 
        message: 'La partie n\'est pas en cours.' 
      };
    }
    
    // Vérifier si les coordonnées sont valides
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return { 
        success: false, 
        message: 'Coordonnées invalides.' 
      };
    }
    
    const player = this.getPlayer(playerId);
    const opponent = this.getPlayer(this.opponent);
    
    // Vérifier si le tir a déjà été effectué
    if (player.shots[row][col]) {
      return { 
        success: false, 
        message: 'Vous avez déjà tiré à cet endroit.' 
      };
    }
    
    // Marquer le tir
    player.shots[row][col] = true;
    
    // Réinitialiser le timer d'inactivité
    this.resetInactivityTimer();
    
    // Vérifier si le tir touche un navire
    const target = opponent.board[row][col];
    if (target !== null) {
      // Touché !
      const ship = opponent.ships[target.shipId];
      ship.hits++;
      
      // Vérifier si le navire est coulé
      if (ship.hits === ship.size) {
        ship.sunk = true;
        
        // Vérifier si tous les navires sont coulés
        if (opponent.ships.every(s => s.sunk)) {
          this.gameState = 'FINISHED';
          this.winner = playerId;
          
          // Annuler le timer d'inactivité
          this.cancelInactivityTimer();
          
          return { 
            success: true, 
            hit: true, 
            sunk: true, 
            shipName: ship.name,
            gameOver: true,
            message: `Touché ! Le ${ship.name} a été coulé ! Vous avez gagné !` 
          };
        }
        
        return { 
          success: true, 
          hit: true, 
          sunk: true, 
          shipName: ship.name,
          message: `Touché ! Le ${ship.name} a été coulé !` 
        };
      }
      
      return { 
        success: true, 
        hit: true, 
        sunk: false,
        message: 'Touché !' 
      };
    }
    
    // Changer de joueur
    const currentPlayerId = this.currentPlayer;
    this.currentPlayer = this.opponent;
    this.opponent = currentPlayerId;
    
    return { 
      success: true, 
      hit: false, 
      message: 'Manqué ! C\'est au tour de ' + this.players[this.currentPlayer].username 
    };
  }
  
  // Génère une représentation visuelle de la grille d'un joueur
  getPlayerBoard(playerId, showShips = false) {
    const player = this.getPlayer(playerId);
    if (!player) return '';
    
    // Symboles pour les différents types de navires
    const shipSymbols = {
      'carrier': 'P',    // Porte-avions
      'battleship': 'C',  // Cuirassé
      'cruiser': 'R',    // Croiseur
      'submarine': 'S',  // Sous-marin
      'destroyer': 'D'    // Contre-torpilleur
    };
    
    // Structure de la grille avec caractères simples
    let result = '  | A | B | C | D | E | F | G | H | I | J |\n';
    result += '--+---+---+---+---+---+---+---+---+---+---+\n';
    
    for (let row = 0; row < this.size; row++) {
      result += `${row} |`;
      
      for (let col = 0; col < this.size; col++) {
        const cell = player.board[row][col];
        
        if (cell !== null && showShips) {
          // Utiliser un symbole pour les navires
          const ship = player.ships[cell.shipId];
          const symbol = shipSymbols[ship.type] || 'N';
          result += ` ${symbol} |`;
        } else {
          result += ' ~ |';  // Eau (vague)
        }
      }
      
      result += '\n--+---+---+---+---+---+---+---+---+---+---+\n';
    }
    
    return result;
  }
  
  // Génère une représentation visuelle de la grille de tirs d'un joueur
  getShotsBoard(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return '';
    
    const opponent = this.getPlayer(this.opponent);
    if (!opponent) return '';
    
    // En-tête des colonnes
    let result = '  | A | B | C | D | E | F | G | H | I | J |\n';
    result += '--+---+---+---+---+---+---+---+---+---+---+\n';
    
    for (let row = 0; row < this.size; row++) {
      result += `${row} |`;
      
      for (let col = 0; col < this.size; col++) {
        if (player.shots[row][col]) {
          const target = opponent.board[row][col];
          if (target !== null) {
            // Touché
            result += ' X |';  // X pour touché
          } else {
            // Manqué
            result += ' O |';  // O pour manqué
          }
        } else {
          // Pas encore tiré
          result += ' · |';  // Point pour case non explorée
        }
      }
      
      result += '\n--+---+---+---+---+---+---+---+---+---+---+\n';
    }
    
    return result;
  }
  
  // Génère une représentation visuelle des deux grilles pour Discord
  getDiscordBoards(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return '';
    
    const legend = `**Légende :**
P = Porte-avions (5 cases)
C = Cuirassé (4 cases)
R = Croiseur (3 cases)
S = Sous-marin (3 cases)
D = Contre-torpilleur (2 cases)
X = Touché
O = Manqué
~ = Eau
· = Non exploré`;
    
    return `**Votre flotte :**\n\`\`\`\n${this.getPlayerBoard(playerId, true)}\`\`\`\n**Vos tirs :**\n\`\`\`\n${this.getShotsBoard(playerId)}\`\`\`\n${legend}`;
  }
  
  // Démarre le timer d'inactivité
  startInactivityTimer() {
    this.cancelInactivityTimer();
    
    this.timeout = setTimeout(async () => {
      // Si aucune action n'a été effectuée depuis 5 minutes, terminer la partie
      if (Date.now() - this.lastActionTime > 5 * 60 * 1000) {
        this.gameState = 'FINISHED';
        this.winner = this.opponent;
        
        // Notifier les joueurs
        if (this.client && this.channelId) {
          try {
            const channel = await this.client.channels.fetch(this.channelId);
            if (channel) {
              await channel.send(`⏰ **Temps écoulé !** ${this.players[this.currentPlayer].username} a été trop long à jouer. ${this.players[this.opponent].username} remporte la partie par forfait !`);
            }
          } catch (error) {
            console.error('Erreur lors de la notification de fin de partie par inactivité:', error);
          }
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  // Réinitialise le timer d'inactivité
  resetInactivityTimer() {
    this.lastActionTime = Date.now();
    this.startInactivityTimer();
  }
  
  // Annule le timer d'inactivité
  cancelInactivityTimer() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

module.exports = { BattleshipGame }; 