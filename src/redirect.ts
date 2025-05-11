import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import { readFileSync } from 'fs';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const config = JSON.parse(readFileSync('./config/config.json', 'utf-8'));
const adminList = config.admins;
const allowedRedirectServers = config.allowed_redirect;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;

function createRedirectHTML(targetUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=${targetUrl}" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="${targetUrl}">${targetUrl}</a></p>
  </body>
</html>`;
}

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
    .setName('redirect')
    .setDescription('Create a short redirection link (admin only)')
    .addStringOption(option =>
      option
        .setName('from')
        .setDescription('The URL to redirect to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('to')
        .setDescription('The alias (e.g., github becomes i.domain.fr/redirect/github)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!adminList.includes(userId) || !guildId || !allowedRedirectServers.includes(guildId)) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command on this server.',
        ephemeral: true,
      });
      return;
    }

    const targetUrl = interaction.options.getString('from', true);
    const alias = interaction.options.getString('to', true);
    const filename = `${alias}.html`;
    const htmlContent = createRedirectHTML(targetUrl);

    await interaction.deferReply({ ephemeral: true });

    const ftp = new FTPClient();
    ftp.ftp.verbose = false;

    try {
      await ftp.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT!),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
      });

      await ftp.cd(process.env.FTP_DIR || '/');
      await ftp.ensureDir('redirect');        // Change to redirect folder
      await ftp.uploadFrom(Readable.from([htmlContent]), filename); // Don't double "redirect"

      const shortUrl = `${process.env.UPLOAD_DOMAIN}/redirect/${alias}`;
      await interaction.editReply(`✅ Redirection created: ${shortUrl}`);
      await sendLog(interaction, `🔗 /redirect by <@${userId}> → ${shortUrl} → ${targetUrl}`);
    } catch (err) {
      console.error('FTP redirect error:', err);
      await interaction.editReply('❌ Failed to create redirect file.');
    } finally {
      ftp.close();
    }
  },
};
