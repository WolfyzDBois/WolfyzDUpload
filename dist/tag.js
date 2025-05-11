import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
const tagsPath = path.resolve('./data/tags.json');
if (!fs.existsSync(tagsPath))
    fs.writeFileSync(tagsPath, '{}');
const logChannelId = process.env.LOG_CHANNEL_ID;
export const data = new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Send a saved tag using its alias')
    .addStringOption(option => option.setName('alias')
    .setDescription('Alias of the tag')
    .setRequired(true));
export async function execute(interaction) {
    const alias = interaction.options.getString('alias', true);
    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
    const tag = tags[alias];
    if (!tag) {
        return await interaction.reply({
            content: '❌ Tag not found.',
            ephemeral: true
        });
    }
    if (tag.embed) {
        const embed = new EmbedBuilder()
            .setDescription(tag.markdown)
            .setTitle(tag.title || '')
            .setColor(tag.color || '#2b2d31');
        await interaction.reply({ embeds: [embed] });
    }
    else {
        await interaction.reply({ content: tag.markdown });
    }
    // Logging
    try {
        const logChannel = await interaction.client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`📢 Tag \`${alias}\` used by <@${interaction.user.id}>`);
        }
    }
    catch (err) {
        console.error('⚠️ Failed to log tag usage:', err);
    }
}
