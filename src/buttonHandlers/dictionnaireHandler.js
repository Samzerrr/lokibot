const dictionnaireGame = require('../games/dictionnaire/DictionnaireGame');

module.exports = {
    prefix: 'dictionnaire_', // Préfixe pour identifier les boutons de ce gestionnaire
    
    execute: async (interaction, client) => {
        const buttonId = interaction.customId;
        
        if (buttonId === 'dictionnaire_true') {
            dictionnaireGame.handleVote(interaction, true);
        } else if (buttonId === 'dictionnaire_false') {
            dictionnaireGame.handleVote(interaction, false);
        }
    }
}; 