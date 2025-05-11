import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import ftp from 'basic-ftp';
import config from './config/config';
const ftpHost = "ftp.wolfyz.fr";
const ftpUser = "u266426828.upload";
const ftpPassword = "Mis45tig9ri!";
const remoteTagsDir = "/tags";
const logChannelId = process.env.LOG_CHANNEL_ID;
export const data = new SlashCommandBuilder()
    .setName('tag_delete')
    .setDescription('Delete a tag by its alias')
    .addStringOption(option => option.setName('alias')
    .setDescription('The alias of the tag to delete')
    .setRequired(true));
export async function execute(interaction) {
    const alias = interaction.options.getString('alias', true);
    const allowed = config.allowed_tags.includes(interaction.user.id);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!allowed && !isAdmin) {
        return await interaction.reply({
            content: '❌ You do not have permission to delete this tag.',
            ephemeral: true
        });
    }
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: ftpHost,
            user: ftpUser,
            password: ftpPassword,
            secure: false
        });
        await client.remove(`${remoteTagsDir}/${alias}.json`);
        await interaction.reply({
            content: `✅ Tag \`${alias}\` has been deleted from the server.`,
            ephemeral: true
        });
        // Logging
        const logChannel = await interaction.client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`🗑️ Tag \`${alias}\` was deleted by <@${interaction.user.id}>`);
        }
    }
    catch (err) {
        console.error('❌ FTP deletion error:', err);
        await interaction.reply({
            content: '❌ Failed to delete this tag (maybe it does not exist).',
            ephemeral: true
        });
    }
    finally {
        client.close();
    }
}
