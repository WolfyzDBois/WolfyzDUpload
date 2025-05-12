import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import ftp from 'basic-ftp';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const FTP_DIR = process.env.FTP_DIRECTORY || '/tags';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const ITEMS_PER_PAGE = 20;

export const command = {
  data: new SlashCommandBuilder()
    .setName('messages_list')
    .setDescription('List all saved message tags'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId || !config.allowed_tags.includes(guildId)) {
      await interaction.reply({
        content: '❌ This server is not allowed to access tags.',
        ephemeral: true
      });
      return;
    }

    const ftpClient = new ftp.Client();
    ftpClient.ftp.verbose = false;

    let aliases: string[] = [];

    try {
      await ftpClient.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT || 21),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
        secure: false
      });

      const files = await ftpClient.list(FTP_DIR);
      aliases = files
        .filter(f => f.name.endsWith('.json'))
        .map(f => f.name.replace('.json', ''))
        .sort();
    } catch (err) {
      console.error('❌ FTP listing error:', err);
      await interaction.reply({
        content: '❌ Failed to retrieve tag list.',
        ephemeral: true
      });
      return;
    } finally {
      ftpClient.close();
    }

    if (aliases.length === 0) {
      await interaction.reply({ content: 'There are no saved tags.', ephemeral: true });
      return;
    }

    let currentPage = 0;
    const maxPage = Math.ceil(aliases.length / ITEMS_PER_PAGE);

    const getPageEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const pageAliases = aliases.slice(start, start + ITEMS_PER_PAGE);
      const content = pageAliases.map(a => `• \`${a}\``).join('\n');

      return new EmbedBuilder()
        .setTitle(`📑 Saved Tags (Page ${page + 1}/${maxPage})`)
        .setDescription(content || '*No tags on this page*')
        .setColor(0x95a5a6)
        .setTimestamp();
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(maxPage <= 1)
    );

    const reply = await interaction.reply({
      embeds: [getPageEmbed(currentPage)],
      components: [row],
      ephemeral: true
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 2 * 60_000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '❌ This is not your interaction.', ephemeral: true });
        return;
      }

      if (i.customId === 'prev_page') currentPage--;
      if (i.customId === 'next_page') currentPage++;

      row.components[0].setDisabled(currentPage === 0);
      row.components[1].setDisabled(currentPage >= maxPage - 1);

      await i.update({
        embeds: [getPageEmbed(currentPage)],
        components: [row]
      });
    });

    // Logging
    try {
      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📃 Tags List Requested')
              .setDescription(`<@${interaction.user.id}> listed all tags`)
              .setColor(0x95a5a6)
              .setTimestamp()
          ]
        });
      }
    } catch (err) {
      console.warn('⚠️ Failed to send list log:', err);
    }
  }
};
