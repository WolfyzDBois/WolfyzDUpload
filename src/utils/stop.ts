import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const adminList = config.admins;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;

async function sendLogEmbed(interaction: ChatInputCommandInteraction, title: string, description: string, color: number) {
  const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
  if (logChannel?.isTextBased() && 'send' in logChannel) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  }
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the bot (admin only)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    if (!adminList.includes(userId)) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '🛑 Stopping the bot...',
      ephemeral: true,
    });

    await sendLogEmbed(
      interaction,
      '🛑 Bot Shutdown',
      `Bot was stopped via \`/stop\` by <@${userId}>.`,
      0x3498db
    );

    process.exit(0);
  },
};
