import { Client, GatewayIntentBits, Interaction, ActivityType, PresenceStatusData, ModalSubmitInteraction } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleTagCreateModal } from './events/interactionCreate.js'; // veille à ce que l'extension .js existe à l'exécution

dotenv.config({ path: './config/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(readFileSync('./config/config.json', 'utf-8'));
const allowedServers = config.allowed_servers;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.DISCORD_TOKEN!;
const logChannelId = process.env.LOG_CHANNEL_ID!;

const PRESENCE_STATUS = (process.env.PRESENCE_STATUS || 'online') as PresenceStatusData;
const ACTIVITY_TYPE = (process.env.ACTIVITY_TYPE || 'playing').toLowerCase();
const ACTIVITY_NAME = process.env.ACTIVITY_NAME || '';
const STREAM_URL = process.env.STREAM_URL || '';

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  const logChannel = await client.channels.fetch(logChannelId);
  if (logChannel?.isTextBased() && 'send' in logChannel) {
    await logChannel.send(`✅ Bot started: ${client.user?.tag}`);
  }

  const activityTypeMap: Record<string, ActivityType> = {
    playing: ActivityType.Playing,
    watching: ActivityType.Watching,
    listening: ActivityType.Listening,
    competing: ActivityType.Competing,
    streaming: ActivityType.Streaming,
  };

  const type = activityTypeMap[ACTIVITY_TYPE] ?? ActivityType.Playing;

  client.user?.setPresence({
    status: PRESENCE_STATUS,
    activities: [{
      name: ACTIVITY_NAME,
      type,
      ...(type === ActivityType.Streaming && STREAM_URL ? { url: STREAM_URL } : {}),
    }],
  });
});

client.on('guildCreate', async (guild) => {
  if (!allowedServers.includes(guild.id)) {
    console.log(`❌ Not allowed server: ${guild.name} (${guild.id}). Leaving...`);
    await guild.leave();
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (interaction.isModalSubmit()) {
    await handleTagCreateModal(interaction as ModalSubmitInteraction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const commandPath = path.join(__dirname, `${interaction.commandName}.js`);
  try {
    const command = await import(`file://${commandPath}`);
    await command.command.execute(interaction);

    const logChannel = await client.channels.fetch(logChannelId);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
      await logChannel.send(`📩 Command \`/${interaction.commandName}\` used by <@${interaction.user.id}>`);
    }
  } catch (error) {
    console.error(`❌ Error during execution of command /${interaction.commandName}`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Error during execution of this command.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Error during execution of this command.', ephemeral: true });
    }
  }
});

client.login(token);
