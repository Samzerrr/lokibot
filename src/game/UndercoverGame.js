const words = require('./words');
const { Leaderboard } = require('../leaderboard');

class UndercoverGame {
  constructor(mrWhiteEnabled = false, maxTurns = 3, undercoverCount = 1) {
    this.players = [];
    this.roles = {};
    this.votes = {};
    this.isStarted = false;
    this.mrWhiteEnabled = mrWhiteEnabled;
    this.undercoverCount = Math.max(1, Math.min(undercoverCount, 3)); // Entre 1 et 3 undercover
    this.wordCommon = '';
    this.wordUndercover = '';
    this.wordMrWhite = "(aucun mot, invente !)";
    this.channelId = null;
    this.currentTurn = 0;
    this.maxTurns = maxTurns;
    this.playerWords = {}; // Stocke les mots envoyés par les joueurs à chaque tour
    this.turnOrder = []; // Ordre des joueurs pour le tour actuel
    this.currentPlayerIndex = 0; // Index du joueur actuel dans turnOrder
    this.turnPhase = 'WORDS'; // WORDS, VOTE, ELIMINATION
    this.wordTimer = null; // Timer pour le délai de soumission des mots
    this.wordTimeoutSeconds = 30; // Délai en secondes pour soumettre un mot
    this.wordTimeoutTimestamp = 0; // Timestamp de fin du délai actuel
    this.client = null; // Référence au client Discord
    this.points = {}; // Points des joueurs
  }

  addPlayer(id, username) {
    console.log(`Tentative d'ajout du joueur ${username} (${id})`);
    if (!this.players.find(p => p.id === id)) {
      this.players.push({ id, username, alive: true });
      console.log(`Joueur ${username} (${id}) ajouté avec succès. Total: ${this.players.length} joueurs`);
    } else {
      console.log(`Joueur ${username} (${id}) déjà dans la partie`);
    }
  }

  assignRoles() {
    console.log("Attribution des rôles...");
    
    // Vérification du nombre de joueurs
    if (this.players.length < 1) {
      console.error("Impossible d'attribuer les rôles : pas assez de joueurs");
      return false;
    }
    
    // Choix des mots
    const pair = words[Math.floor(Math.random() * words.length)];
    this.wordCommon = pair[0];
    this.wordUndercover = pair[1];
    this.wordMrWhite = "(aucun mot, invente !)";
    
    console.log(`Mots choisis - Civil: ${this.wordCommon}, Undercover: ${this.wordUndercover}`);
    
    // Attribution des rôles
    let roles = Array(this.players.length).fill('CIVIL');
    
    // Si un seul joueur, il est civil
    if (this.players.length > 1) {
      // Limiter le nombre d'undercover au nombre de joueurs - 1
      // (au moins 1 civil doit rester)
      const maxUndercoverPossible = Math.min(this.undercoverCount, this.players.length - 1);
      console.log(`Nombre d'undercover demandé: ${this.undercoverCount}, maximum possible: ${maxUndercoverPossible}`);
      
      // Sélectionner les indices pour les undercover
      const undercoverIndices = [];
      while (undercoverIndices.length < maxUndercoverPossible) {
        const index = Math.floor(Math.random() * roles.length);
        if (!undercoverIndices.includes(index)) {
          undercoverIndices.push(index);
          roles[index] = 'UNDERCOVER';
          console.log(`Undercover à l'index ${index}`);
        }
      }
      
      // Mr White seulement s'il y a plus de undercover + 1 joueurs
      if (this.mrWhiteEnabled && this.players.length > maxUndercoverPossible + 1) {
        let mrWhiteIndex;
        do {
          mrWhiteIndex = Math.floor(Math.random() * roles.length);
        } while (roles[mrWhiteIndex] === 'UNDERCOVER');
        roles[mrWhiteIndex] = 'MRWHITE';
        console.log(`Mr White à l'index ${mrWhiteIndex}`);
      }
    }
    
    // Attribution des rôles aux joueurs
    this.players.forEach((p, i) => {
      this.roles[p.id] = roles[i];
      console.log(`Joueur ${p.username} (${p.id}) : ${roles[i]}`);
    });
    
    this.isStarted = true;
    console.log("Attribution des rôles terminée");
    return true;
  }

  async sendRoles(client) {
    console.log(`Début de l'envoi des rôles à ${this.players.length} joueurs`);
    
    for (const p of this.players) {
      let word = this.wordCommon;
      let message = "";
      
      if (this.roles[p.id] === 'UNDERCOVER') {
        word = this.wordUndercover;
        message = `${word}`;
      } else if (this.roles[p.id] === 'MRWHITE') {
        word = this.wordMrWhite;
        message = `Vous êtes **Mr. White** !\n\nVous n'avez pas de mot secret. Essayez de deviner le mot des civils en écoutant les autres joueurs.`;
      } else {
        message = `${word}`;
      }
      
      console.log(`Tentative d'envoi du message à ${p.username} (${p.id})`);
      
      try {
        // Récupération de l'utilisateur avec force refresh pour s'assurer d'avoir les données les plus récentes
        const user = await client.users.fetch(p.id, { force: true });
        
        if (!user) {
          console.error(`Utilisateur non trouvé: ${p.id}`);
          continue;
        }
        
        // Envoi du message privé
        await user.send(message);
        console.log(`Message privé envoyé avec succès à ${p.username} (${p.id})`);
      } catch (error) {
        console.error(`Erreur lors de l'envoi du message privé à ${p.username} (${p.id}):`, error);
        
        // Tentative de notification dans le canal du jeu
        try {
          const gameChannel = await client.channels.fetch(this.channelId);
          if (gameChannel) {
            await gameChannel.send(`<@${p.id}> Je n'ai pas pu vous envoyer de message privé. Veuillez vérifier vos paramètres de confidentialité Discord et autoriser les messages privés de ce bot.`);
          } else {
            console.error(`Canal de jeu non trouvé: ${this.channelId}`);
          }
        } catch (channelError) {
          console.error(`Erreur lors de la notification dans le canal: ${channelError}`);
        }
      }
    }
    
    console.log('Fin de l\'envoi des rôles');
  }

  // Vote blanc
  voteBlank(voterId) {
    if (!this.players.find(p => p.id === voterId && p.alive)) {
      return { error: 'Vous n\'êtes pas dans la partie ou déjà éliminé.' };
    }
    
    // Le vote blanc est représenté par 'blank'
    this.votes[voterId] = 'blank';
    console.log(`Joueur ${voterId} a voté blanc`);
    return { success: true };
  }

  // Vote contre un joueur
  vote(voterId, targetId) {
    if (!this.players.find(p => p.id === voterId && p.alive)) {
      return { error: 'Vous n\'êtes pas dans la partie ou déjà éliminé.' };
    }
    if (!this.players.find(p => p.id === targetId && p.alive)) {
      return { error: 'Cible invalide.' };
    }
    this.votes[voterId] = targetId;
    console.log(`Joueur ${voterId} a voté contre ${targetId}`);
    return { success: true };
  }

  // Génère un résumé des votes actuels
  getVotesSummary() {
    const votesCount = {};
    let blanks = 0;
    
    // Compter les votes
    for (const targetId of Object.values(this.votes)) {
      if (targetId === 'blank') {
        blanks++;
      } else {
        votesCount[targetId] = (votesCount[targetId] || 0) + 1;
      }
    }
    
    let summary = `**Votes actuels:**\n\n`;
    
    // Ajouter les votes pour chaque joueur
    for (const [targetId, count] of Object.entries(votesCount)) {
      const player = this.players.find(p => p.id === targetId);
      if (player) {
        summary += `**${player.username}**: ${count} vote(s)\n`;
      }
    }
    
    // Ajouter les votes blancs
    if (blanks > 0) {
      summary += `\n**Votes blancs**: ${blanks}`;
    }
    
    return summary;
  }

  // Vérifie si tous les joueurs ont voté
  isVotingComplete() {
    return Object.keys(this.votes).length === this.players.filter(p => p.alive).length;
  }

  // Élimine le joueur avec le plus de votes
  eliminatePlayer() {
    // Compte les votes
    const count = {};
    let blanks = 0;
    
    for (const targetId of Object.values(this.votes)) {
      if (targetId === 'blank') {
        blanks++;
      } else {
        count[targetId] = (count[targetId] || 0) + 1;
      }
    }
    
    console.log(`Votes: ${JSON.stringify(count)}, Blancs: ${blanks}`);
    
    // Vérifier si les votes blancs sont majoritaires
    const totalVotes = Object.keys(this.votes).length;
    if (blanks > totalVotes / 2) {
      console.log(`Les votes blancs sont majoritaires (${blanks}/${totalVotes}). Personne n'est éliminé.`);
      this.votes = {};
      return null;
    }
    
    // Trouver le joueur avec le plus de votes
    let max = 0, eliminatedId = null;
    let tie = false;
    
    for (const [id, c] of Object.entries(count)) {
      if (c > max) {
        max = c;
        eliminatedId = id;
        tie = false;
      } else if (c === max && c > 0) {
        tie = true;
      }
    }
    
    // En cas d'égalité, personne n'est éliminé
    if (tie) {
      console.log(`Égalité des votes. Personne n'est éliminé.`);
      this.votes = {};
      return null;
    }
    
    // Éliminer le joueur
    const eliminated = this.players.find(p => p.id === eliminatedId);
    if (eliminated) {
      eliminated.alive = false;
      console.log(`Joueur éliminé: ${eliminated.username} (${eliminated.id})`);
    }
    
    this.votes = {};
    return eliminated;
  }

  checkWin() {
    const alive = this.players.filter(p => p.alive);
    const undercovers = alive.filter(p => this.roles[p.id] === 'UNDERCOVER');
    const mrwhites = alive.filter(p => this.roles[p.id] === 'MRWHITE');
    const civils = alive.filter(p => this.roles[p.id] === 'CIVIL');
    
    // Les civils gagnent s'ils éliminent tous les imposteurs
    if (undercovers.length === 0 && mrwhites.length === 0) {
      return 'CIVIL';
    }
    
    // Les imposteurs gagnent s'il ne reste plus qu'un civil
    if (civils.length <= 1 && (undercovers.length > 0 || mrwhites.length > 0)) {
      return 'UNDERCOVER';
    }
    
    return null;
  }

  getWinMessage() {
    const win = this.checkWin();
    if (win === 'CIVIL') {
      const pointsSummary = this.attributePoints('CIVIL');
      return `Victoire des Civils ! Ils ont éliminé tous les imposteurs.\n\n${pointsSummary}`;
    }
    if (win === 'UNDERCOVER') {
      const pointsSummary = this.attributePoints('UNDERCOVER');
      return `Victoire des Imposteurs ! Ils ont survécu jusqu'à ce qu'il ne reste plus qu'un Civil.\n\n${pointsSummary}`;
    }
    return '';
  }

  getMrWhiteWinMessage(player) {
    const pointsSummary = this.attributePoints('MRWHITE');
    return `Victoire de **${player.username}** (Mr. White) ! Il a deviné correctement le mot des Civils.\n\n${pointsSummary}`;
  }

  // Démarre un nouveau tour
  startNewTurn() {
    this.currentTurn++;
    console.log(`Démarrage du tour ${this.currentTurn}/${this.maxTurns}`);
    
    // Réinitialiser les données du tour
    this.turnPhase = 'WORDS';
    this.votes = {};
    
    // Mélanger l'ordre des joueurs pour ce tour
    this.turnOrder = [...this.players.filter(p => p.alive)];
    this.shuffleArray(this.turnOrder);
    this.currentPlayerIndex = 0;
    
    // Démarrer le timer pour le joueur actuel
    this.startWordTimer();
    
    return {
      turnNumber: this.currentTurn,
      maxTurns: this.maxTurns,
      currentPlayer: this.getCurrentPlayer(),
      timeoutSeconds: this.wordTimeoutSeconds
    };
  }
  
  // Mélange un tableau (pour l'ordre des joueurs)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  // Récupère le joueur actuel
  getCurrentPlayer() {
    if (this.currentPlayerIndex >= this.turnOrder.length) return null;
    return this.turnOrder[this.currentPlayerIndex];
  }
  
  // Enregistre le mot d'un joueur et passe au joueur suivant
  submitWord(playerId, word) {
    const currentPlayer = this.getCurrentPlayer();
    
    // Vérifier que c'est bien le tour de ce joueur
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { 
        error: "Ce n'est pas votre tour de jouer.",
        currentPlayer: currentPlayer ? currentPlayer.username : null
      };
    }
    
    // Annuler le timer actuel
    this.clearWordTimer();
    
    // Enregistrer le mot
    if (!this.playerWords[this.currentTurn]) {
      this.playerWords[this.currentTurn] = {};
    }
    this.playerWords[this.currentTurn][playerId] = word;
    console.log(`Joueur ${currentPlayer.username} a soumis le mot: ${word}`);
    
    // Passer au joueur suivant
    this.currentPlayerIndex++;
    
    // Si tous les joueurs ont joué, passer à la phase de vote
    if (this.currentPlayerIndex >= this.turnOrder.length) {
      this.turnPhase = 'VOTE';
      return { 
        success: true, 
        isRoundComplete: true,
        summary: this.getWordsSummary()
      };
    }
    
    // Démarrer le timer pour le joueur suivant
    this.startWordTimer();
    
    return { 
      success: true, 
      isRoundComplete: false,
      nextPlayer: this.getCurrentPlayer(),
      timeoutSeconds: this.wordTimeoutSeconds,
      timeoutTimestamp: this.wordTimeoutTimestamp
    };
  }
  
  // Génère un résumé des mots soumis pour ce tour
  getWordsSummary() {
    if (!this.playerWords[this.currentTurn]) return "Aucun mot soumis pour ce tour.";
    
    let summary = `**Mots du tour ${this.currentTurn}:**\n\n`;
    
    for (const player of this.turnOrder) {
      const word = this.playerWords[this.currentTurn][player.id] || "Pas de mot";
      summary += `**${player.username}**: ${word}\n`;
    }
    
    return summary;
  }
  
  // Vérifie si tous les tours sont terminés
  isGameComplete() {
    return this.currentTurn >= this.maxTurns;
  }
  
  // Réinitialise la phase de vote pour un nouveau tour
  prepareNextTurn() {
    this.votes = {};
    if (this.isGameComplete()) {
      return { isGameComplete: true };
    }
    return this.startNewTurn();
  }

  getRolesReveal() {
    let msg = 'Rôles révélés :\n';
    for (const p of this.players) {
      msg += `${p.username} : ${this.roles[p.id]}\n`;
    }
    msg += `Mot Civil : ${this.wordCommon}\nMot Undercover : ${this.wordUndercover}`;
    if (this.mrWhiteEnabled) msg += `\nMr White : ${this.wordMrWhite}`;
    return msg;
  }

  // Génère un résumé des mots soumis jusqu'à présent pour ce tour
  getCurrentWordsSummary() {
    if (!this.playerWords[this.currentTurn]) return "Aucun mot soumis pour ce tour.";
    
    let summary = `**Mots soumis pour le tour ${this.currentTurn}:**\n\n`;
    
    for (let i = 0; i < this.currentPlayerIndex; i++) {
      const player = this.turnOrder[i];
      const word = this.playerWords[this.currentTurn][player.id] || "Pas de mot";
      summary += `**${player.username}**: ${word}\n`;
    }
    
    // Ajouter les joueurs qui n'ont pas encore soumis de mot
    if (this.currentPlayerIndex < this.turnOrder.length) {
      summary += `\n**En attente de:**\n`;
      for (let i = this.currentPlayerIndex; i < this.turnOrder.length; i++) {
        summary += `${this.turnOrder[i].username}\n`;
      }
    }
    
    return summary;
  }

  // Démarre le timer pour le joueur actuel
  startWordTimer() {
    // Annuler le timer précédent s'il existe
    this.clearWordTimer();
    
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;
    
    console.log(`Démarrage du timer pour ${currentPlayer.username} (${this.wordTimeoutSeconds} secondes)`);
    
    // Définir le timestamp de fin
    this.wordTimeoutTimestamp = Date.now() + (this.wordTimeoutSeconds * 1000);
    
    // Démarrer un nouveau timer
    this.wordTimer = setTimeout(() => {
      this.handleWordTimeout();
    }, this.wordTimeoutSeconds * 1000);
  }
  
  // Gère le timeout pour la soumission d'un mot
  async handleWordTimeout() {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;
    
    console.log(`Timeout pour ${currentPlayer.username}`);
    
    // Soumettre un mot par défaut
    if (!this.playerWords[this.currentTurn]) {
      this.playerWords[this.currentTurn] = {};
    }
    this.playerWords[this.currentTurn][currentPlayer.id] = "(pas de mot)";
    
    // Passer au joueur suivant
    this.currentPlayerIndex++;
    
    // Envoyer une notification dans le canal
    if (this.client) {
      try {
        const gameChannel = await this.client.channels.fetch(this.channelId);
        if (gameChannel) {
          await gameChannel.send(`⏰ <@${currentPlayer.id}> n'a pas soumis de mot dans le temps imparti. Un mot par défaut a été enregistré.`);
          
          // Si tous les joueurs ont joué, passer à la phase de vote
          if (this.currentPlayerIndex >= this.turnOrder.length) {
            this.turnPhase = 'VOTE';
            await gameChannel.send({
              content: "Tous les joueurs ont soumis leur mot ! Phase de vote...",
              embeds: [{
                color: 0x00ff00,
                title: `Récapitulatif des mots - Tour ${this.currentTurn}/${this.maxTurns}`,
                description: this.getWordsSummary(),
                timestamp: new Date(),
                footer: {
                  text: 'Undercover Game | Dev by Samzerrr'
                }
              }]
            });
            await gameChannel.send("Utilisez la commande `/vote @joueur` pour voter contre un joueur suspect ou `/vote blanc` pour voter blanc.");
          } else {
            // Démarrer le timer pour le joueur suivant
            this.startWordTimer();
            await gameChannel.send(`⏱️ C'est maintenant au tour de <@${this.getCurrentPlayer().id}> de soumettre un mot. **Vous avez ${this.wordTimeoutSeconds} secondes !**`);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi de la notification de timeout:", error);
      }
    }
  }
  
  // Annule le timer actuel
  clearWordTimer() {
    if (this.wordTimer) {
      clearTimeout(this.wordTimer);
      this.wordTimer = null;
    }
  }
  
  // Définit le client Discord
  setClient(client) {
    this.client = client;
  }

  // Attribue les points en fonction du résultat de la partie
  attributePoints(winningTeam) {
    // Selon les règles officielles :
    // - Civils : 2 points chacun
    // - Mr. White : 6 points
    // - Undercover : 10 points
    
    console.log(`Attribution des points pour l'équipe gagnante: ${winningTeam}`);
    
    if (winningTeam === 'CIVIL') {
      // Les civils gagnent
      for (const p of this.players) {
        if (this.roles[p.id] === 'CIVIL') {
          this.points[p.id] = (this.points[p.id] || 0) + 2;
          console.log(`${p.username} (CIVIL) gagne 2 points`);
          
          // Ajouter les points au leaderboard
          Leaderboard.addPoints(p.id, p.username, 2);
          Leaderboard.addWin(p.id, p.username, 'undercover');
        } else {
          // Les autres joueurs ont participé mais n'ont pas gagné
          Leaderboard.addGame(p.id, p.username, 'undercover');
        }
      }
    } else if (winningTeam === 'UNDERCOVER') {
      // Les imposteurs gagnent
      for (const p of this.players) {
        if (this.roles[p.id] === 'UNDERCOVER') {
          this.points[p.id] = (this.points[p.id] || 0) + 10;
          console.log(`${p.username} (UNDERCOVER) gagne 10 points`);
          
          // Ajouter les points au leaderboard
          Leaderboard.addPoints(p.id, p.username, 10);
          Leaderboard.addWin(p.id, p.username, 'undercover');
        }
        if (this.roles[p.id] === 'MRWHITE') {
          this.points[p.id] = (this.points[p.id] || 0) + 6;
          console.log(`${p.username} (MRWHITE) gagne 6 points`);
          
          // Ajouter les points au leaderboard
          Leaderboard.addPoints(p.id, p.username, 6);
          Leaderboard.addWin(p.id, p.username, 'undercover');
        }
        if (this.roles[p.id] === 'CIVIL') {
          // Les civils ont participé mais n'ont pas gagné
          Leaderboard.addGame(p.id, p.username, 'undercover');
        }
      }
    } else if (winningTeam === 'MRWHITE') {
      // Mr. White gagne seul (en devinant le mot)
      for (const p of this.players) {
        if (this.roles[p.id] === 'MRWHITE') {
          this.points[p.id] = (this.points[p.id] || 0) + 6;
          console.log(`${p.username} (MRWHITE) gagne 6 points`);
          
          // Ajouter les points au leaderboard
          Leaderboard.addPoints(p.id, p.username, 6);
          Leaderboard.addWin(p.id, p.username, 'undercover');
        } else {
          // Les autres joueurs ont participé mais n'ont pas gagné
          Leaderboard.addGame(p.id, p.username, 'undercover');
        }
      }
    }
    
    return this.getPointsSummary();
  }
  
  // Génère un résumé des points
  getPointsSummary() {
    let summary = "**Points gagnés :**\n\n";
    
    for (const p of this.players) {
      const pointsGained = this.points[p.id] || 0;
      if (pointsGained > 0) {
        summary += `**${p.username}** : +${pointsGained} points\n`;
      }
    }
    
    return summary;
  }

  // Permet à Mr. White de deviner le mot des civils
  guessCivilWord(playerId, word) {
    // Vérifier que le joueur est bien Mr. White
    if (this.roles[playerId] !== 'MRWHITE') {
      return { 
        error: "Vous n'êtes pas Mr. White, vous ne pouvez pas deviner le mot des civils."
      };
    }
    
    // Vérifier que le joueur est toujours en vie
    const player = this.players.find(p => p.id === playerId && p.alive);
    if (!player) {
      return { 
        error: "Vous avez déjà été éliminé."
      };
    }
    
    // Vérifier si le mot est correct
    const isCorrect = word.toLowerCase().trim() === this.wordCommon.toLowerCase().trim();
    
    return {
      success: true,
      isCorrect: isCorrect,
      player: player,
      guessedWord: word,
      actualWord: this.wordCommon
    };
  }
}

module.exports = { UndercoverGame }; 