import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const admins = JSON.parse(readFileSync('./config/admin.json', 'utf-8')).admins;
const users = JSON.parse(readFileSync('./config/user.json', 'utf-8')).allowed_users;
const servers = JSON.parse(readFileSync('./config/servers.json', 'utf-8')).allowed_servers;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;

async function sendLog(interaction: ChatInputCommandInteraction, message: string) {
  try {
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
      await logChannel.send(message);
    }
  } catch (err) {
    console.warn('Unable to send log:', err);
  }
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show bot configuration info (admin only)'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!admins.includes(interaction.user.id)) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command.',
        ephemeral: true,
      });
      return;
    }

    const client = interaction.client;
    const guilds = client.guilds.cache
      .map((g) => `• ${g.name} (ID: ${g.id})`)
      .join('\n');

    await interaction.reply({
      content:
        `**Server Info:**\n` +
        `• Current Server ID: ${interaction.guildId}\n` +
        `• Current Server Name: ${interaction.guild?.name}\n\n` +
        `**Log Channel ID:** ${LOG_CHANNEL_ID}\n` +
        `**Allowed Users:** ${users.join(', ')}\n` +
        `**Admins:** ${admins.map((id: string) => `<@${id}>`).join(', ')}\n` +
        `**Allowed Servers:** ${servers.join(', ')}\n\n` +
        `**Connected Servers:**\n${guilds}`,
      ephemeral: true,
    });

    await sendLog(interaction, `ℹ️ /info used by <@${interaction.user.id}>`);
  },
};
