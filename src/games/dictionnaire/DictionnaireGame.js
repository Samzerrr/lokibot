const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class DictionnaireGame {
    constructor() {
        this.games = new Map();
        this.loadWords();
    }

    loadWords() {
        try {
            const filePath = path.join(__dirname, 'mots_rares.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                this.words = JSON.parse(data);
            } else {
                // Mots rares avec leurs vraies définitions
                this.words = [
                    { mot: "Acrimonie", definition: "Aigreur, amertume dans les propos, les écrits ou le caractère." },
                    { mot: "Callipyge", definition: "Qui a de belles fesses." },
                    { mot: "Épistolaire", definition: "Qui a rapport aux lettres, à la correspondance par lettres." },
                    { mot: "Faconde", definition: "Abondance de paroles, éloquence facile et bavarde." },
                    { mot: "Goguenard", definition: "Qui aime plaisanter, railler de façon narquoise." },
                    { mot: "Histrion", definition: "Comédien, bouffon, saltimbanque dans l'Antiquité romaine." },
                    { mot: "Ineffable", definition: "Qui ne peut être exprimé par des paroles." },
                    { mot: "Jactance", definition: "Bavardage présomptueux, vantardise." },
                    { mot: "Logorrhée", definition: "Flux de paroles inutiles et incohérentes." },
                    { mot: "Méphitique", definition: "Qui exhale une odeur désagréable, nauséabonde." }
                ];
                fs.writeFileSync(filePath, JSON.stringify(this.words, null, 2), 'utf8');
            }
        } catch (error) {
            console.error("Erreur lors du chargement des mots:", error);
            this.words = [];
        }
    }

    // Génère une fausse définition pour un mot
    generateFakeDefinition(realDefinition) {
        const fakeDefinitions = [
            "Outil utilisé dans l'agriculture médiévale pour le battage des céréales.",
            "Maladie rare affectant principalement le système respiratoire.",
            "Technique de peinture originaire d'Italie utilisant des pigments naturels.",
            "Phénomène astronomique lié à l'alignement de certaines planètes.",
            "Instrument de musique à cordes utilisé dans la musique traditionnelle nordique.",
            "Cérémonie rituelle pratiquée dans certaines tribus d'Amazonie.",
            "Concept philosophique développé au XVIIIe siècle sur la perception du temps.",
            "Petit mammifère nocturne vivant dans les régions montagneuses d'Asie.",
            "Technique de navigation utilisée par les explorateurs polynésiens.",
            "Méthode de conservation des aliments pratiquée dans les régions arctiques."
        ];
        
        // Sélectionne une définition aléatoire différente de la vraie définition
        let fakeDefinition;
        do {
            fakeDefinition = fakeDefinitions[Math.floor(Math.random() * fakeDefinitions.length)];
        } while (fakeDefinition === realDefinition);
        
        return fakeDefinition;
    }

    startGame(channelId, interaction) {
        // Sélectionne un mot aléatoire
        const randomWord = this.words[Math.floor(Math.random() * this.words.length)];
        const isRealDefinition = Math.random() > 0.5; // 50% de chance d'utiliser la vraie définition
        
        const definition = isRealDefinition 
            ? randomWord.definition 
            : this.generateFakeDefinition(randomWord.definition);
        
        // Crée un embed pour afficher le mot et sa définition
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Jeu du Dictionnaire`)
            .setDescription(`**Mot: ${randomWord.mot}**\n\n**Définition proposée:**\n${definition}`)
            .setColor('#3498db')
            .addFields(
                { name: 'Instructions', value: 'Cette définition est-elle vraie ou fausse? Votez avec les boutons ci-dessous.' }
            )
            .setFooter({ text: 'Vous avez 30 secondes pour voter!' });
        
        // Crée les boutons pour voter
        const trueButton = new ButtonBuilder()
            .setCustomId('dictionnaire_true')
            .setLabel('Vraie')
            .setStyle(ButtonStyle.Success);
        
        const falseButton = new ButtonBuilder()
            .setCustomId('dictionnaire_false')
            .setLabel('Fausse')
            .setStyle(ButtonStyle.Danger);
        
        const row = new ActionRowBuilder().addComponents(trueButton, falseButton);
        
        // Enregistre les informations du jeu
        this.games.set(channelId, {
            word: randomWord.mot,
            realDefinition: randomWord.definition,
            shownDefinition: definition,
            isRealDefinition: isRealDefinition,
            votes: {
                true: [],
                false: []
            },
            messageId: null,
            timeout: null
        });
        
        // Envoie le message et enregistre son ID
        interaction.reply({ embeds: [embed], components: [row] })
            .then(message => {
                const game = this.games.get(channelId);
                if (game) {
                    game.messageId = interaction.id;
                    
                    // Configure un timeout pour terminer le jeu après 30 secondes
                    game.timeout = setTimeout(() => {
                        this.endGame(channelId, interaction);
                    }, 30000);
                }
            });
    }
    
    handleVote(interaction, isTrue) {
        const channelId = interaction.channelId;
        const userId = interaction.user.id;
        const game = this.games.get(channelId);
        
        if (!game) {
            interaction.reply({ content: "Aucun jeu en cours dans ce canal.", ephemeral: true });
            return;
        }
        
        // Vérifie si l'utilisateur a déjà voté
        if (game.votes.true.includes(userId) || game.votes.false.includes(userId)) {
            interaction.reply({ content: "Vous avez déjà voté!", ephemeral: true });
            return;
        }
        
        // Enregistre le vote
        if (isTrue) {
            game.votes.true.push(userId);
        } else {
            game.votes.false.push(userId);
        }
        
        interaction.reply({ content: `Votre vote a été enregistré!`, ephemeral: true });
    }
    
    endGame(channelId, interaction) {
        const game = this.games.get(channelId);
        if (!game) return;
        
        // Annule le timeout si le jeu se termine avant
        if (game.timeout) {
            clearTimeout(game.timeout);
        }
        
        // Calcule les résultats
        const trueVotes = game.votes.true.length;
        const falseVotes = game.votes.false.length;
        const totalVotes = trueVotes + falseVotes;
        
        // Détermine qui a gagné
        const correctAnswer = game.isRealDefinition ? 'true' : 'false';
        const truePercentage = totalVotes > 0 ? Math.round((trueVotes / totalVotes) * 100) : 0;
        const falsePercentage = totalVotes > 0 ? Math.round((falseVotes / totalVotes) * 100) : 0;
        
        // Crée un embed pour afficher les résultats
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Résultats - Jeu du Dictionnaire`)
            .setDescription(`**Mot: ${game.word}**\n\n**Définition proposée:**\n${game.shownDefinition}`)
            .setColor(game.isRealDefinition ? '#2ecc71' : '#e74c3c')
            .addFields(
                { name: 'Résultat', value: game.isRealDefinition ? '✅ La définition était **VRAIE**!' : '❌ La définition était **FAUSSE**!' },
                { name: 'Vraie définition', value: game.realDefinition },
                { name: 'Votes', value: `✅ Vraie: ${trueVotes} (${truePercentage}%)\n❌ Fausse: ${falseVotes} (${falsePercentage}%)` }
            )
            .setFooter({ text: `Total des votes: ${totalVotes}` });
        
        // Met à jour le message original avec les résultats
        interaction.editReply({ embeds: [embed], components: [] });
        
        // Supprime le jeu de la map
        this.games.delete(channelId);
    }
}

module.exports = new DictionnaireGame(); 