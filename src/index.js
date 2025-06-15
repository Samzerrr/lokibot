require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const statusManager = require('./utils/statusManager');
const messageFilter = require('./utils/messageFilter');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();
client.buttonHandlers = new Collection(); // Ajout d'une collection pour les gestionnaires de boutons
client.modalHandlers = new Collection(); // Ajout d'une collection pour les gestionnaires de formulaires

// Chargement dynamique des commandes
const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Chargement dynamique des gestionnaires de boutons
const buttonHandlersPath = __dirname + '/buttonHandlers';
if (fs.existsSync(buttonHandlersPath)) {
  const buttonFiles = fs.readdirSync(buttonHandlersPath).filter(file => file.endsWith('.js'));
  for (const file of buttonFiles) {
    const buttonHandler = require(`./buttonHandlers/${file}`);
    client.buttonHandlers.set(buttonHandler.prefix, buttonHandler);
  }
}

// Chargement dynamique des gestionnaires de formulaires
const modalHandlersPath = __dirname + '/modalHandlers';
if (fs.existsSync(modalHandlersPath)) {
  const modalFiles = fs.readdirSync(modalHandlersPath).filter(file => file.endsWith('.js'));
  for (const file of modalFiles) {
    const modalHandler = require(`./modalHandlers/${file}`);
    client.modalHandlers.set(modalHandler.prefix, modalHandler);
  }
}

const PREFIX = '!'; // Préfixe pour les commandes texte

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  
  // Restaurer le statut sauvegardé au démarrage du bot
  statusManager.applyStatus(client);
});

client.on('interactionCreate', async interaction => {
  // Gestion des commandes slash
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error);
      
      // Gérer spécifiquement les erreurs connues de Discord
      if (error.code === 10062) { // Unknown interaction
        console.log(`Interaction ${interaction.id} expirée ou inconnue. Ignorée.`);
        return;
      } else if (error.code === 40060) { // Interaction already acknowledged
        console.log(`Interaction ${interaction.id} déjà reconnue. Ignorée.`);
        return;
      }
      
      // Vérifier si l'interaction peut encore recevoir une réponse
      if (interaction.replied || interaction.deferred) {
        try {
          await interaction.followUp({ 
            content: 'Une erreur est survenue lors de l\'exécution de la commande.', 
            ephemeral: true 
          }).catch(followUpError => {
            console.error('Impossible d\'envoyer un followUp:', followUpError);
          });
        } catch (followUpError) {
          console.error('Échec total de communication avec l\'interaction:', followUpError);
        }
      } else {
        try {
          await interaction.deferReply({ ephemeral: true })
            .then(() => interaction.editReply({ 
              content: 'Une erreur est survenue lors de l\'exécution de la commande.'
            }))
            .catch(replyError => {
              console.error('Impossible de répondre à l\'interaction:', replyError);
            });
        } catch (replyError) {
          console.error('Échec total de communication avec l\'interaction:', replyError);
        }
      }
    }
    return;
  }

  // Gestion des interactions avec les boutons
  if (interaction.isButton()) {
    try {
      const customId = interaction.customId;
      
      // Trouver le gestionnaire de bouton approprié
      for (const [prefix, handler] of client.buttonHandlers) {
        if (Array.isArray(prefix)) {
          // Si prefix est un tableau, vérifier si un des préfixes correspond
          if (prefix.some(p => customId.startsWith(p))) {
            await handler.execute(interaction, client);
            return;
          }
        } else if (customId.startsWith(prefix)) {
          await handler.execute(interaction, client);
          return;
        }
      }
      
      // Si aucun gestionnaire n'a été trouvé
      console.warn(`Aucun gestionnaire trouvé pour le bouton avec l'ID: ${customId}`);
    } catch (error) {
      console.error('Erreur lors de la gestion du bouton:', error);
      
      // Gérer spécifiquement les erreurs connues de Discord
      if (error.code === 10062) { // Unknown interaction
        console.log(`Interaction ${interaction.id} expirée ou inconnue. Ignorée.`);
        return;
      } else if (error.code === 40060) { // Interaction already acknowledged
        console.log(`Interaction ${interaction.id} déjà reconnue. Ignorée.`);
        return;
      }
      
      try {
        const errorMessage = 'Une erreur est survenue lors du traitement de cette interaction.';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true })
            .catch(followupErr => console.error('Erreur lors du followUp:', followupErr));
        } else {
          await interaction.deferUpdate()
            .then(() => interaction.followUp({ content: errorMessage, ephemeral: true }))
            .catch(replyErr => console.error('Impossible de répondre à l\'interaction:', replyErr));
        }
      } catch (replyError) {
        console.error('Échec total de communication avec l\'interaction:', replyError);
      }
    }
  }
  
  // Gestion des interactions avec les formulaires modaux
  if (interaction.isModalSubmit()) {
    try {
      const customId = interaction.customId;
      
      // Trouver le gestionnaire de formulaire approprié
      for (const [prefix, handler] of client.modalHandlers) {
        if (Array.isArray(prefix)) {
          // Si prefix est un tableau, vérifier si un des préfixes correspond
          if (prefix.some(p => customId.startsWith(p))) {
            await handler.execute(interaction, client);
            return;
          }
        } else if (customId.startsWith(prefix)) {
          await handler.execute(interaction, client);
          return;
        }
      }
      
      // Si aucun gestionnaire n'a été trouvé
      console.warn(`Aucun gestionnaire trouvé pour le formulaire avec l'ID: ${customId}`);
    } catch (error) {
      console.error('Erreur lors de la gestion du formulaire:', error);
      
      // Gérer spécifiquement les erreurs connues de Discord
      if (error.code === 10062) { // Unknown interaction
        console.log(`Interaction ${interaction.id} expirée ou inconnue. Ignorée.`);
        return;
      } else if (error.code === 40060) { // Interaction already acknowledged
        console.log(`Interaction ${interaction.id} déjà reconnue. Ignorée.`);
        return;
      }
      
      try {
        const errorMessage = 'Une erreur est survenue lors du traitement de ce formulaire.';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true })
            .catch(followupErr => console.error('Erreur lors du followUp:', followupErr));
        } else {
          await interaction.deferReply({ ephemeral: true })
            .then(() => interaction.editReply({ content: errorMessage }))
            .catch(replyErr => console.error('Impossible de répondre à l\'interaction:', replyErr));
        }
      } catch (replyError) {
        console.error('Échec total de communication avec l\'interaction:', replyError);
      }
    }
  }
});

client.on('messageCreate', async message => {
  // Utiliser notre gestionnaire de filtrage
  const isFiltered = await messageFilter.processMessage(message);
  if (isFiltered) return; // Si le message a été filtré, ne pas continuer le traitement

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    // On simule un objet interaction minimal pour compatibilité
    await command.execute({
      user: message.author,
      channelId: message.channel.id,
      options: {
        getInteger: (name) => {
          const index = command.data.options.findIndex(opt => opt.name === name);
          if (index !== -1 && args[index]) return parseInt(args[index], 10);
          return null;
        },
        getUser: (name) => {
          // Cherche un utilisateur mentionné ou par nom
          if (message.mentions.users.size > 0) return message.mentions.users.first();
          return null;
        }
      },
      reply: (data) => message.reply(data.content || data),
      followUp: (data) => message.channel.send(data),
      fetchReply: async () => message,
    }, client);
  } catch (error) {
    console.error(error);
    await message.reply('Erreur lors de l\'exécution de la commande.');
  }
});

client.login(process.env.DISCORD_TOKEN); 