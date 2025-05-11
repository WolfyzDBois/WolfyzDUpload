import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../config/config.json';
const tagsPath = path.resolve('./data/tags.json');
if (!fs.existsSync(tagsPath))
    fs.writeFileSync(tagsPath, '{}');
const logChannelId = process.env.LOG_CHANNEL_ID;
export const data = new SlashCommandBuilder()
    .setName('tag_delete')
    .setDescription('Delete a tag by its alias')
    .addStringOption(option => option.setName('alias')
    .setDescription('The alias of the tag to delete')
    .setRequired(true));
export async function execute(interaction) {
    const alias = interaction.options.getString('alias', true);
    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
    const allowed = config.allowed_tags.includes(interaction.user.id);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!allowed && !isAdmin) {
        return await interaction.reply({
            content: '❌ You do not have permission to delete this tag.',
            ephemeral: true
        });
    }
    if (!tags[alias]) {
        return await interaction.reply({
            content: '❌ This tag does not exist.',
            ephemeral: true
        });
    }
    delete tags[alias];
    fs.writeFileSync(tagsPath, JSON.stringify(tags, null, 2));
    await interaction.reply({
        content: `✅ Tag \`${alias}\` has been deleted.`,
        ephemeral: true
    });
    // Logging
    try {
        const logChannel = await interaction.client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`🗑️ Tag \`${alias}\` was deleted by <@${interaction.user.id}>`);
        }
    }
    catch (err) {
        console.error('⚠️ Failed to log tag deletion:', err);
    }
}
