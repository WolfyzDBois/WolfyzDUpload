import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import ftp from 'basic-ftp';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const FTP_DIR = process.env.FTP_DIRECTORY || '/tags';
const TEMP_DIR = path.resolve('./temp-tags');

export const command = {
  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Send a saved tag using its name')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The tag name to retrieve')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const guildId = interaction.guildId;
    const tempPath = path.join(TEMP_DIR, `${name}.json`);

    if (!guildId || !config.allowed_tags.includes(guildId)) {
      await interaction.reply({
        content: '❌ This server is not allowed to use this command.',
        ephemeral: true,
      });
      return;
    }

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: process.env.FTP_HOST!,
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
        port: Number(process.env.FTP_PORT || 21),
        secure: false,
      });

      await client.downloadTo(tempPath, `${FTP_DIR}/${name}.json`);
      const tag = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));

      if (tag.embed) {
        const embed = new EmbedBuilder()
          .setTitle(tag.title || '')
          .setDescription(tag.markdown)
          .setColor(tag.color || '#2b2d31');

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: tag.markdown });
      }

      const log = new EmbedBuilder()
        .setTitle('📢 Tag Used')
        .setDescription(`**Name:** \`${name}\`\n**User:** <@${interaction.user.id}>`)
        .setColor(0x95a5a6)
        .setTimestamp();

      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send({ embeds: [log] });
      }
    } catch (err) {
      console.error('❌ Tag retrieval error:', err);

      await interaction.reply({
        content: '❌ This tag does not exist or could not be loaded.',
        ephemeral: true,
      });

      const log = new EmbedBuilder()
        .setTitle('❌ Tag Load Error')
        .setDescription(`**Name:** \`${name}\`\n**User:** <@${interaction.user.id}>`)
        .setColor(0xe74c3c)
        .setTimestamp();

      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send({ embeds: [log] });
      }
    } finally {
      client.close();
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  },
};
