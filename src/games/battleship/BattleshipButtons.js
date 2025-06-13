const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Classe qui gère les boutons pour l'interface de la Bataille Navale
 */
class BattleshipButtons {
  /**
   * Crée les boutons pour le placement d'un navire
   * @param {string} shipType - Type de navire à placer
   * @returns {Array} - Tableau de composants ActionRow avec les boutons
   */
  static createShipPlacementUI(shipType) {
    // Création du tableau de boutons pour les lettres (colonnes)
    const letterRows = [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // Création du tableau de boutons pour les orientations
    const orientationRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`orientation_horizontal_${shipType}`)
          .setLabel('Horizontal')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`orientation_vertical_${shipType}`)
          .setStyle(ButtonStyle.Primary)
          .setLabel('Vertical'),
        new ButtonBuilder()
          .setCustomId(`cancel_placement`)
          .setStyle(ButtonStyle.Danger)
          .setLabel('Annuler')
      );
    
    // Création de deux rangées de 5 lettres chacune
    const letterRow1 = new ActionRowBuilder();
    const letterRow2 = new ActionRowBuilder();
    
    for (let i = 0; i < 5; i++) {
      letterRow1.addComponents(
        new ButtonBuilder()
          .setCustomId(`col_${letters[i]}_${shipType}`)
          .setLabel(letters[i])
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    for (let i = 5; i < 10; i++) {
      letterRow2.addComponents(
        new ButtonBuilder()
          .setCustomId(`col_${letters[i]}_${shipType}`)
          .setLabel(letters[i])
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    // Création de deux rangées de 5 chiffres chacune
    const numberRow1 = new ActionRowBuilder();
    const numberRow2 = new ActionRowBuilder();
    
    for (let i = 0; i < 5; i++) {
      numberRow1.addComponents(
        new ButtonBuilder()
          .setCustomId(`row_${i}_${shipType}`)
          .setLabel(`${i}`)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    for (let i = 5; i < 10; i++) {
      numberRow2.addComponents(
        new ButtonBuilder()
          .setCustomId(`row_${i}_${shipType}`)
          .setLabel(`${i}`)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    return [orientationRow, letterRow1, letterRow2, numberRow1, numberRow2];
  }
  
  /**
   * Crée un embed pour le placement d'un navire
   * @param {string} shipType - Type de navire à placer
   * @param {object} shipInfo - Informations sur le navire
   * @param {object} playerInfo - Informations sur le joueur
   * @returns {EmbedBuilder} - Embed avec les informations de placement
   */
  static createShipPlacementEmbed(shipType, shipInfo, playerInfo) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`🚢 Placement de votre ${shipInfo.name}`)
      .setDescription(`Choisissez la position et l'orientation pour placer votre ${shipInfo.name} (${shipInfo.size} cases)`)
      .addFields(
        { name: 'Instructions', value: '1. Sélectionnez une orientation (Horizontal/Vertical)\n2. Sélectionnez une colonne (A-J)\n3. Sélectionnez une ligne (0-9)' },
        { name: 'Votre grille actuelle', value: playerInfo.boardDisplay || 'Grille vide' }
      )
      .setTimestamp()
      .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
    
    return embed;
  }
  
  /**
   * Crée un embed pour afficher le résultat du placement
   * @param {object} result - Résultat du placement
   * @param {string} boardDisplay - Affichage de la grille
   * @returns {EmbedBuilder} - Embed avec le résultat du placement
   */
  static createPlacementResultEmbed(result, boardDisplay) {
    const embed = new EmbedBuilder()
      .setColor(result.success ? 0x00FF00 : 0xFF0000)
      .setTitle(result.success ? '✅ Navire placé avec succès' : '❌ Erreur de placement')
      .setDescription(result.message)
      .addFields(
        { name: 'Votre grille', value: `\`\`\`\n${boardDisplay}\`\`\`` },
        { name: 'Navires restants à placer', value: formatRemainingShips(result.remainingShips) }
      )
      .setTimestamp()
      .setFooter({ text: 'Bataille Navale | Dev by Samzerrr' });
    
    return embed;
  }
  
  /**
   * Crée les boutons pour les navires disponibles
   * @param {object} remainingShips - Navires restants à placer
   * @returns {Array} - Tableau de composants ActionRow avec les boutons
   */
  static createShipSelectionButtons(remainingShips) {
    try {
      console.log('Création des boutons de sélection de navires');
      console.log('Navires restants:', JSON.stringify(remainingShips));
      
      if (!remainingShips) {
        console.error('remainingShips est undefined ou null');
        // Retourner une rangée vide pour éviter les erreurs
        return [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('cancel_placement')
            .setLabel('Retour')
            .setStyle(ButtonStyle.Secondary)
        )];
      }
      
      const rows = [];
      const shipTypes = {
        'carrier': { name: 'Porte-avions', size: 5 },
        'battleship': { name: 'Cuirassé', size: 4 },
        'cruiser': { name: 'Croiseur', size: 3 },
        'submarine': { name: 'Sous-marin', size: 3 },
        'destroyer': { name: 'Contre-torpilleur', size: 2 }
      };
      
      // Créer jusqu'à 3 rangées de boutons (maximum 5 boutons par rangée)
      let currentRow = new ActionRowBuilder();
      let buttonCount = 0;
      let anyShipsRemaining = false;
      
      for (const [type, info] of Object.entries(remainingShips)) {
        if (info && info.remaining && info.remaining > 0) {
          anyShipsRemaining = true;
          
          // Si la rangée actuelle a déjà 5 boutons, passer à la suivante
          if (buttonCount === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
          }
          
          // Vérifier que ce type de navire existe dans shipTypes
          if (!shipTypes[type]) {
            console.error(`Type de navire inconnu: ${type}`);
            continue;
          }
          
          // Ajouter un bouton pour ce type de navire
          currentRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`select_ship_${type}`)
              .setLabel(`${shipTypes[type].name} (${shipTypes[type].size})`)
              .setStyle(ButtonStyle.Primary)
          );
          
          buttonCount++;
        }
      }
      
      // Ajouter un bouton "Je suis prêt" s'il n'y a plus de navires à placer
      if (!anyShipsRemaining) {
        if (buttonCount === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
          buttonCount = 0;
        }
        
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId('ready')
            .setLabel('Je suis prêt !')
            .setStyle(ButtonStyle.Success)
        );
        
        buttonCount++;
      }
      
      // Ajouter la dernière rangée si elle n'est pas vide
      if (buttonCount > 0) {
        rows.push(currentRow);
      }
      
      console.log(`Nombre de rangées de boutons créées: ${rows.length}`);
      
      // S'assurer qu'il y a au moins une rangée de boutons
      if (rows.length === 0) {
        console.log('Aucune rangée de boutons créée, ajout d\'une rangée avec bouton par défaut');
        return [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('cancel_placement')
            .setLabel('Retour')
            .setStyle(ButtonStyle.Secondary)
        )];
      }
      
      return rows;
    } catch (error) {
      console.error('Erreur lors de la création des boutons de sélection de navires:', error);
      // Retourner une rangée vide pour éviter les erreurs
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cancel_placement')
          .setLabel('Retour')
          .setStyle(ButtonStyle.Secondary)
      )];
    }
  }
}

// Fonction pour formater l'affichage des navires restants
function formatRemainingShips(remainingShips) {
  try {
    if (!remainingShips) {
      return 'Aucune information disponible sur les navires restants.';
    }
    
    let result = '';
    
    for (const [type, info] of Object.entries(remainingShips)) {
      if (info && info.remaining && info.remaining > 0) {
        result += `- ${info.name} (${info.size} cases) : ${info.remaining}\n`;
      }
    }
    
    if (result === '') {
      result = 'Tous les navires ont été placés ! Utilisez le bouton "Je suis prêt" pour commencer la partie.';
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors du formatage des navires restants:', error);
    return 'Erreur lors de l\'affichage des navires restants.';
  }
}

module.exports = { BattleshipButtons }; 