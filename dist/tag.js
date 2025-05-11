import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import ftp from 'basic-ftp';
const ftpHost = "ftp.wolfyz.fr";
const ftpUser = "u266426828.upload";
const ftpPassword = "Mis45tig9ri!";
const remoteTagsDir = "/tags";
const tempDir = path.resolve('./temp-tags');
const logChannelId = process.env.LOG_CHANNEL_ID;
export const data = new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Send a saved tag using its alias')
    .addStringOption(option => option.setName('alias')
    .setDescription('Alias of the tag')
    .setRequired(true));
export async function execute(interaction) {
    const alias = interaction.options.getString('alias', true);
    const tagFilePath = path.join(tempDir, `${alias}.json`);
    if (!fs.existsSync(tempDir))
        fs.mkdirSync(tempDir);
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: ftpHost,
            user: ftpUser,
            password: ftpPassword,
            secure: false
        });
        await client.downloadTo(tagFilePath, `${remoteTagsDir}/${alias}.json`);
        const tag = JSON.parse(fs.readFileSync(tagFilePath, 'utf-8'));
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
        const logChannel = await interaction.client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`📢 Tag \`${alias}\` used by <@${interaction.user.id}>`);
        }
    }
    catch (err) {
        console.error('❌ FTP or parsing error:', err);
        await interaction.reply({
            content: '❌ This tag does not exist or could not be loaded.',
            ephemeral: true
        });
    }
    finally {
        client.close();
        if (fs.existsSync(tagFilePath))
            fs.unlinkSync(tagFilePath);
    }
}
