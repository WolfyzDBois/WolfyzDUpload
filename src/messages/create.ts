import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import config from '@config';

export const command = {
  data: new SlashCommandBuilder()
    .setName('messages_create')
    .setDescription('Create a saved tag to send later with /messages'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId || !config.allowed_tags.includes(guildId)) {
      await interaction.reply({
        content: '❌ This server is not allowed to use this command.',
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('tag_create_modal')
      .setTitle('Create a Tag');

    const aliasInput = new TextInputBuilder()
      .setCustomId('alias')
      .setLabel('Tag name (letters, numbers, _ only)')
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const isEmbedInput = new TextInputBuilder()
      .setCustomId('is_embed')
      .setLabel('Embed? (true/false)')
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Embed title (optional)')
      .setRequired(false)
      .setStyle(TextInputStyle.Short);

    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Embed hex color (optional)')
      .setRequired(false)
      .setStyle(TextInputStyle.Short);

    const contentInput = new TextInputBuilder()
      .setCustomId('markdown')
      .setLabel('Tag content (markdown supported)')
      .setRequired(true)
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
};
