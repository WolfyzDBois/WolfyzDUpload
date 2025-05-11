import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalActionRowComponentBuilder
  } from 'discord.js';
  
  export const data = new SlashCommandBuilder()
    .setName('tag_create')
    .setDescription('Create a tag with alias, content, and embed options.');
  
  export async function execute(interaction: any) {
    const modal = new ModalBuilder()
      .setCustomId('tag_create_modal')
      .setTitle('Create a Tag');
  
    const aliasInput = new TextInputBuilder()
      .setCustomId('alias')
      .setLabel('Tag alias')
      .setStyle(TextInputStyle.Short);
  
    const isEmbedInput = new TextInputBuilder()
      .setCustomId('is_embed')
      .setLabel('Is embed? (true/false)')
      .setStyle(TextInputStyle.Short);
  
    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Embed title (optional)')
      .setStyle(TextInputStyle.Short);
  
    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Embed hex color (optional)')
      .setStyle(TextInputStyle.Short);
  
    const contentInput = new TextInputBuilder()
      .setCustomId('markdown')
      .setLabel('Markdown content of the tag')
      .setStyle(TextInputStyle.Paragraph);
  
    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(aliasInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(isEmbedInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(titleInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(colorInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(contentInput)
    );
  
    await interaction.showModal(modal);
  }
  