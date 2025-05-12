import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const adminList = config.admins;
const allowedServers = config.allowed_redirect;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const FTP_DIR = process.env.FTP_DIR || '/redirect';

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
    .setName('links')
    .setDescription('Create a short redirection (admin only)')
    .addStringOption(option =>
      option
        .setName('from')
        .setDescription('The URL to redirect to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('to')
        .setDescription('The name of the redirection')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!adminList.includes(userId) || !guildId || !allowedServers.includes(guildId)) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command on this server.',
        ephemeral: true,
      });
      return;
    }

    const targetUrl = interaction.options.getString('from', true);
    const name = interaction.options.getString('to', true);
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

      await ftp.ensureDir(FTP_DIR);
      await ftp.uploadFrom(Readable.from([htmlContent]), `${FTP_DIR}/${name}.html`);

      const shortUrl = `${process.env.UPLOAD_DOMAIN}/redirect/${name}`;
      await interaction.editReply(`✅ Redirection created: ${shortUrl}`);

      await sendLogEmbed(
        interaction,
        '🔗 Redirection Created',
        `<@${userId}> created a redirect:\n• **From**: ${shortUrl}\n• **To**: ${targetUrl}`,
        0x2ecc71
      );
    } catch (err) {
      console.error('❌ FTP redirect error:', err);
      await interaction.editReply('❌ Failed to create redirect file.');

      await sendLogEmbed(
        interaction,
        '❌ Redirection Error',
        `An error occurred during /links by <@${userId}>`,
        0xe74c3c
      );
    } finally {
      ftp.close();
    }
  },
};
