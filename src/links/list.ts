import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import { Writable } from 'stream';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const adminList = config.admins;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const PER_PAGE = 20;
const REDIRECT_DIR = process.env.FTP_DIR || '/redirect';

function streamToBuffer() {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  return {
    writable,
    getBuffer: () => Buffer.concat(chunks),
  };
}

function parseRedirectTarget(content: string): string | null {
  const match = content.match(/url=(.*?)"/);
  return match ? match[1] : null;
}

function generateEmbed(redirects: { name: string; url: string }[], page: number) {
  const totalPages = Math.ceil(redirects.length / PER_PAGE);
  const start = page * PER_PAGE;
  const pageLinks = redirects.slice(start, start + PER_PAGE);

  return new EmbedBuilder()
    .setTitle(`🔗 Redirect List (Page ${page + 1}/${totalPages})`)
    .setDescription(
      pageLinks.map(entry => `\`${entry.name}\` → ${entry.url}`).join('\n') || '*No redirects found.*'
    )
    .setColor(0x3498db)
    .setTimestamp();
}

async function sendLog(interaction: ChatInputCommandInteraction, title: string, description: string, color: number) {
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
    .setName('links_list')
    .setDescription('List all redirections (admin only)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    if (!adminList.includes(userId)) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command.',
        ephemeral: true,
      });
      return;
    }

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

      await ftp.cd(REDIRECT_DIR);
      const files = await ftp.list();

      const redirects: { name: string; url: string }[] = [];

      for (const file of files) {
        if (!file.isFile || !file.name.endsWith('.html')) continue;

        const name = file.name.replace('.html', '');
        const { writable, getBuffer } = streamToBuffer();
        await ftp.downloadTo(writable, file.name);
        const content = getBuffer().toString();
        const url = parseRedirectTarget(content);

        if (url) {
          redirects.push({ name, url });
        }
      }

      if (redirects.length === 0) {
        await interaction.editReply('No redirection found.');
        return;
      }

      let page = 0;
      const embed = generateEmbed(redirects, page);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(redirects.length <= PER_PAGE)
      );

      const reply = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: '❌ You cannot interact with these buttons.', ephemeral: true });
          return;
        }

        if (i.customId === 'prev') page--;
        if (i.customId === 'next') page++;

        row.components[0].setDisabled(page <= 0);
        row.components[1].setDisabled((page + 1) * PER_PAGE >= redirects.length);

        const newEmbed = generateEmbed(redirects, page);
        await i.update({ embeds: [newEmbed], components: [row] });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] });
      });

      await sendLog(interaction, '📄 Redirection List Used', `<@${userId}> used /links_list`, 0x95a5a6);
    } catch (err) {
      console.error('❌ FTP list_redirect error:', err);
      await interaction.editReply('❌ Failed to retrieve redirects.');

      await sendLog(
        interaction,
        '❌ Redirection Listing Failed',
        `Error during /links_list by <@${userId}>`,
        0xe74c3c
      );
    } finally {
      ftp.close();
    }
  }
};
