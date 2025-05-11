import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageFlags,
  } from 'discord.js';
  import { fetch } from 'undici';
  import path from 'path';
  import { tmpdir } from 'os';
  import { randomUUID } from 'crypto';
  import { pipeline } from 'stream/promises';
  import { Readable } from 'stream';
  import { createWriteStream, unlinkSync, readFileSync } from 'fs';
  import ftp from 'basic-ftp';
  import dotenv from 'dotenv';
  
  dotenv.config({ path: './config/.env' });
  
  const allowedUsers = JSON.parse(
    readFileSync('./config/user.json', 'utf-8')
  ).allowed_users;
  const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
  const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 0);
  
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
      .setName('upload')
      .setDescription('Upload a file or a link to the FTP server')
      .addAttachmentOption(opt =>
        opt.setName('fichier').setDescription('Upload a file').setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('lien').setDescription('Upload a file by URL').setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('name').setDescription('Custom filename (no extension)').setRequired(false)
      ),
  
    async execute(interaction: ChatInputCommandInteraction) {
      const userId = interaction.user.id;
  
      if (!allowedUsers.includes(userId)) {
        await interaction.reply({
          content: '❌ You are not authorized to use this command.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
  
      const file = interaction.options.getAttachment('fichier');
      const url = interaction.options.getString('lien');
      const customName = interaction.options.getString('name');
  
      if (!file && !url) {
        await interaction.reply({
          content: '❌ You must provide either a file or a link.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
  
      if (file && MAX_FILE_MB > 0 && file.size / (1024 * 1024) > MAX_FILE_MB) {
        await interaction.reply({
          content: `❌ File is too large. Max size: ${MAX_FILE_MB} MB.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
  
      await interaction.deferReply();
  
      const downloadUrl = file?.url ?? url!;
      const originalName = file?.name ?? url ?? 'file.unknown';
      const extension = path.extname(originalName) || '.bin';
      const filename = `${customName || `upload_${randomUUID().slice(0, 8)}`}${extension}`;
      const tempPath = path.join(tmpdir(), filename);
  
      const res = await fetch(downloadUrl);
      if (!res.ok || !res.body) {
        await interaction.editReply('❌ Failed to download file.');
        return;
      }
  
      if (!file && MAX_FILE_MB > 0) {
        const contentLength = res.headers.get('content-length');
        if (contentLength && parseInt(contentLength) / (1024 * 1024) > MAX_FILE_MB) {
          await interaction.editReply(`❌ File is too large. Max size: ${MAX_FILE_MB} MB.`);
          await sendLog(interaction, `⚠️ Upload refused (too large) by <@${userId}>`);
          return;
        }
      }
  
      const stream = createWriteStream(tempPath);
      await pipeline(Readable.fromWeb(res.body), stream);
  
      const ftpClient = new ftp.Client();
      ftpClient.ftp.verbose = false;
  
      try {
        await ftpClient.access({
          host: process.env.FTP_HOST!,
          port: Number(process.env.FTP_PORT!),
          user: process.env.FTP_USER!,
          password: process.env.FTP_PASS!,
        });
  
        await ftpClient.uploadFrom(tempPath, filename);
  
        const finalUrl = `${process.env.UPLOAD_DOMAIN}/${filename}`;
        await interaction.editReply(`✅ File uploaded: ${finalUrl}`);
        await sendLog(interaction, `✅ File uploaded by <@${userId}>: ${finalUrl}`);
      } catch (err) {
        console.error("❌ FTP error:", err);
        await interaction.editReply('❌ FTP upload failed.');
        await sendLog(interaction, `❌ FTP error during upload by <@${userId}>`);
      } finally {
        ftpClient.close();
        try {
          unlinkSync(tempPath);
        } catch {}
      }
    }
  };
  