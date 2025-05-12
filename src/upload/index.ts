import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';
import { fetch } from 'undici';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream, unlinkSync } from 'fs';
import ftp from 'basic-ftp';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const allowedUsers = config.allowed_users;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 0);

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
    .setName('upload_index')
    .setDescription('Upload a file or a URL to the FTP server')
    .addAttachmentOption(opt =>
      opt.setName('file')
        .setDescription('Attach a file to upload')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('URL to fetch and upload')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Custom filename without extension')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    if (!allowedUsers.includes(userId)) {
      await interaction.reply({
        content: '❌ You are not allowed to use this command.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const file = interaction.options.getAttachment('file');
    const url = interaction.options.getString('url');
    const customName = interaction.options.getString('name');

    if (!file && !url) {
      await interaction.reply({
        content: '❌ You must provide a file or a URL.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (file && MAX_FILE_MB > 0 && file.size / 1024 / 1024 > MAX_FILE_MB) {
      await interaction.reply({
        content: `❌ File is too large. Maximum allowed: ${MAX_FILE_MB} MB.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const sourceUrl = file?.url ?? url!;
    const originalName = file?.name ?? url ?? 'unknown';
    const extension = path.extname(originalName) || '.bin';
    const filename = `${customName || `upload_${randomUUID().slice(0, 8)}`}${extension}`;
    const tempPath = path.join(tmpdir(), filename);

    const response = await fetch(sourceUrl);
    if (!response.ok || !response.body) {
      await interaction.editReply('❌ Failed to download the file.');
      await sendLogEmbed(interaction, '❌ Download Failed', `Failed to download file from \`${sourceUrl}\` by <@${userId}>.`, 0xe74c3c);
      return;
    }

    if (!file && MAX_FILE_MB > 0) {
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) / 1024 / 1024 > MAX_FILE_MB) {
        await interaction.editReply(`❌ File is too large. Maximum allowed: ${MAX_FILE_MB} MB.`);
        await sendLogEmbed(interaction, '⚠️ Upload Blocked (Size)', `Refused upload by <@${userId}> (exceeds ${MAX_FILE_MB} MB).`, 0xf39c12);
        return;
      }
    }

    const output = createWriteStream(tempPath);
    await pipeline(Readable.fromWeb(response.body), output);

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT!),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
        secure: false
      });

      await client.uploadFrom(tempPath, filename);
      const publicUrl = `${process.env.UPLOAD_DOMAIN}/${filename}`;

      await interaction.editReply(`✅ File uploaded: ${publicUrl}`);
      await sendLogEmbed(interaction, '✅ File Uploaded', `<@${userId}> uploaded: [${filename}](${publicUrl})`, 0x2ecc71);
    } catch (err) {
      console.error('❌ FTP Upload Error:', err);
      await interaction.editReply('❌ FTP upload failed.');
      await sendLogEmbed(interaction, '❌ FTP Error', `FTP error while uploading \`${filename}\` by <@${userId}>.`, 0xe74c3c);
    } finally {
      client.close();
      try {
        unlinkSync(tempPath);
      } catch {}
    }
  }
};
