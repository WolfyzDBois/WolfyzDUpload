import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import path from 'path';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const FTP_DIRECTORY = process.env.FTP_DIRECTORY || '/';

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
    .setName('upload_delete')
    .setDescription('Delete a file from the FTP server (admin only)')
    .addStringOption(option =>
      option
        .setName('link')
        .setDescription('The full URL to the file to delete')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    if (!config.admins.includes(userId)) {
      await interaction.reply({
        content: '❌ You are not allowed to use this command.',
        ephemeral: true
      });
      return;
    }

    const url = interaction.options.getString('link', true);
    const filename = path.basename(new URL(url).pathname);

    const ftp = new FTPClient();
    ftp.ftp.verbose = false;

    try {
      await ftp.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT || 21),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
        secure: false
      });

      await ftp.cd(FTP_DIRECTORY);
      await ftp.remove(filename);

      await interaction.reply({
        content: `✅ File \`${filename}\` has been deleted from the server.`,
        ephemeral: true
      });

      await sendLogEmbed(
        interaction,
        '🗑️ File Deleted',
        `File \`${filename}\` was deleted by <@${userId}>.`,
        0xe67e22
      );
    } catch (err) {
      console.error('❌ FTP delete error:', err);
      await interaction.reply({
        content: '❌ Failed to delete the file on the FTP server.',
        ephemeral: true
      });

      await sendLogEmbed(
        interaction,
        '❌ Deletion Failed',
        `An error occurred while <@${userId}> tried to delete \`${filename}\`.`,
        0xe74c3c
      );
    } finally {
      ftp.close();
    }
  }
};
