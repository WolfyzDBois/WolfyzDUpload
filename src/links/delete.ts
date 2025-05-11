import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const config = JSON.parse(readFileSync('./config/config.json', 'utf-8'));
const adminList = config.admins;
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
    .setName('delete_redirect')
    .setDescription('Delete a redirection (admin only)')
    .addStringOption(opt =>
      opt.setName('alias')
        .setDescription('Alias name (e.g., github for /redirect/github)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!adminList.includes(interaction.user.id)) {
      await interaction.reply({ content: '❌ You are not authorized.', ephemeral: true });
      return;
    }

    const alias = interaction.options.getString('alias', true);
    const filename = `redirect/${alias}.html`;

    const ftp = new FTPClient();
    ftp.ftp.verbose = false;

    try {
      await ftp.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT!),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
      });

      await ftp.cd(process.env.FTP_DIRECTORY || '/');
      await ftp.remove(filename);

      await interaction.reply({ content: `🗑️ Redirection \`${alias}\` deleted.`, ephemeral: true });
      await sendLog(interaction, `🗑️ /delete_redirect by <@${interaction.user.id}> → ${alias}`);
    } catch (err) {
      console.error('FTP delete redirect error:', err);
      await interaction.reply({ content: '❌ Failed to delete the redirect.', ephemeral: true });
    } finally {
      ftp.close();
    }
  },
};
