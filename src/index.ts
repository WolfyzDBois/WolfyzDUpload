import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: './config/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.DISCORD_TOKEN!;
const logChannelId = process.env.LOG_CHANNEL_ID!;
const servers = JSON.parse(readFileSync('./config/servers.json', 'utf-8')).allowed_servers;

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user?.tag}`);
  const logChannel = await client.channels.fetch(logChannelId);
  if (logChannel?.isTextBased() && 'send' in logChannel) {
    await logChannel.send(`✅ Bot démarré en tant que ${client.user?.tag}`);
  }
});

client.on('guildCreate', async (guild) => {
  if (!servers.includes(guild.id)) {
    console.log(`❌ Serveur non autorisé : ${guild.name} (${guild.id}). Déconnexion.`);
    await guild.leave();
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandPath = path.join(__dirname, `${interaction.commandName}.js`);
  try {
    const command = await import(`file://${commandPath}`);
    await command.command.execute(interaction);

    const logChannel = await client.channels.fetch(logChannelId);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
      await logChannel.send(`📩 Commande \`/${interaction.commandName}\` utilisée par <@${interaction.user.id}>`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de /${interaction.commandName}`, error);
    await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
  }
});

client.login(token);
