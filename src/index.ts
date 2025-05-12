import {
  Client,
  GatewayIntentBits,
  Interaction,
  ModalSubmitInteraction,
  ActivityType,
  PresenceStatusData
} from 'discord.js';
import dotenv from 'dotenv';
import { handleTagCreateModal } from './events/interactionCreate.js';
import path from 'path';
import { glob } from 'glob';
import { pathToFileURL, fileURLToPath } from 'url';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (!config.allowed_servers.includes(guild.id)) {
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

  // Recherche dynamique du fichier
  const matches = glob.sync(`**/${interaction.commandName}.js`, {
    cwd: path.resolve(__dirname),
    absolute: true,
  });

  if (matches.length === 0) {
    console.error(`❌ Command module for /${interaction.commandName} not found.`);
    await interaction.reply({
      content: '❌ This command is not available on the bot.',
      ephemeral: true,
    });
    return;
  }

  const commandPath = matches[0];
  console.log(`📦 Trying to load command module: ${commandPath}`);

  try {
    const command = await import(pathToFileURL(commandPath).href);

    if (!command?.command?.execute) {
      throw new Error('Invalid command module structure');
    }

    await command.command.execute(interaction);
    console.log(`🚀 Successfully executed /${interaction.commandName}`);
  } catch (error) {
    console.error(`❌ Error during execution of /${interaction.commandName}:`, error);

    const replyMethod = interaction.replied || interaction.deferred
      ? interaction.followUp.bind(interaction)
      : interaction.reply.bind(interaction);

    await replyMethod({
      content: '❌ Error during execution of this command.',
      ephemeral: true,
    });
  }
});

client.login(token);
