import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
  } from 'discord.js';
  import fs from 'fs';
  import path from 'path';
  
  const tagsPath = path.resolve('./data/tags.json');
  if (!fs.existsSync(tagsPath)) fs.writeFileSync(tagsPath, '{}');
  
  const logChannelId = process.env.LOG_CHANNEL_ID!;
  const ITEMS_PER_PAGE = 20;
  
  export const data = new SlashCommandBuilder()
    .setName('tag_list')
    .setDescription('List all saved tags');
  
  export async function execute(interaction: ChatInputCommandInteraction) {
    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
    const aliases = Object.keys(tags);
  
    if (aliases.length === 0) {
      return await interaction.reply({ content: 'No tags saved yet.', ephemeral: true });
    }
  
    let currentPage = 0;
    const maxPage = Math.ceil(aliases.length / ITEMS_PER_PAGE);
  
    const getPageContent = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const slice = aliases.slice(start, end).map(alias => `- \`${alias}\``).join('\n');
      return `📄 Page ${page + 1}/${maxPage}\n\n${slice}`;
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
      content: getPageContent(currentPage),
      components: [row],
      ephemeral: true
    });
  
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000
    });
  
    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: 'This is not your interaction.',
          ephemeral: true
        });
      }
  
      if (buttonInteraction.customId === 'prev_page' && currentPage > 0) {
        currentPage--;
      } else if (buttonInteraction.customId === 'next_page' && currentPage < maxPage - 1) {
        currentPage++;
      }
  
      row.components[0].setDisabled(currentPage === 0);
      row.components[1].setDisabled(currentPage >= maxPage - 1);
  
      await buttonInteraction.update({
        content: getPageContent(currentPage),
        components: [row]
      });
    });
  
    // Logging
    try {
      const logChannel = await interaction.client.channels.fetch(logChannelId);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send(`📃 Tag list requested by <@${interaction.user.id}>`);
      }
    } catch (err) {
      console.error('⚠️ Failed to log tag_list usage:', err);
    }
  }
  