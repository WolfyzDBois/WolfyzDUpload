import fs from 'fs';
import path from 'path';
const tagsPath = path.resolve('./data/tags.json');
if (!fs.existsSync(tagsPath))
    fs.writeFileSync(tagsPath, '{}');
const logChannelId = process.env.LOG_CHANNEL_ID;
export async function handleTagCreateModal(interaction) {
    if (interaction.customId !== 'tag_create_modal')
        return;
    const alias = interaction.fields.getTextInputValue('alias').trim();
    const isEmbed = interaction.fields.getTextInputValue('is_embed').trim().toLowerCase() === 'true';
    const title = interaction.fields.getTextInputValue('title').trim();
    const color = interaction.fields.getTextInputValue('color').trim();
    const markdown = interaction.fields.getTextInputValue('markdown').trim();
    const aliasRegex = /^[a-z0-9_]+$/;
    if (!aliasRegex.test(alias)) {
        return await interaction.reply({
            content: '❌ Invalid alias. Use only lowercase letters, numbers, and underscores.',
            ephemeral: true
        });
    }
    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
    if (tags[alias]) {
        return await interaction.reply({
            content: `❌ A tag with the alias \`${alias}\` already exists.`,
            ephemeral: true
        });
    }
    tags[alias] = {
        embed: isEmbed,
        title,
        color,
        markdown
    };
    fs.writeFileSync(tagsPath, JSON.stringify(tags, null, 2));
    await interaction.reply({
        content: `✅ Tag \`${alias}\` has been successfully saved.`,
        ephemeral: true
    });
    // Logging
    try {
        const logChannel = await interaction.client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`📌 Tag \`${alias}\` was created by <@${interaction.user.id}>`);
        }
    }
    catch (err) {
        console.error('⚠️ Failed to log tag creation:', err);
    }
}
