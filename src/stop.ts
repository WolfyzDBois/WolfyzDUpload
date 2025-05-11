import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const adminList = JSON.parse(
  readFileSync('./config/admin.json', 'utf-8')
).admins;
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
    .setName('stop')
    .setDescription('Stop the bot (admin only)'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!adminList.includes(interaction.user.id)) {
      await interaction.reply({
        content: '❌ You are not allowed to use this command.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '🛑 Stop ...',
      ephemeral: true,
    });

    await sendLog(interaction, `🛑 Bot stopped via /stop by <@${interaction.user.id}>`);
    process.exit(0);
  },
};
