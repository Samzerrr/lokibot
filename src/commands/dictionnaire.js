const { SlashCommandBuilder } = require('discord.js');
const dictionnaireGame = require('../games/dictionnaire/DictionnaireGame');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dictionnaire')
        .setDescription('Lance un jeu du dictionnaire avec des mots rares'),
    
    async execute(interaction) {
        dictionnaireGame.startGame(interaction.channelId, interaction);
    },
}; 