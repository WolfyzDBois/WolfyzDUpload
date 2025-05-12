import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import config from '../config/config.js';
dotenv.config({ path: './src/config/.env' });
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const FTP_DIRECTORY = process.env.FTP_DIRECTORY || '/';
const UPLOAD_DOMAIN = process.env.UPLOAD_DOMAIN;
const PER_PAGE = 20;
function createEmbed(links, page) {
    const totalPages = Math.ceil(links.length / PER_PAGE);
    const start = page * PER_PAGE;
    const currentLinks = links.slice(start, start + PER_PAGE);
    return new EmbedBuilder()
        .setTitle(`📂 Uploaded Files (Page ${page + 1}/${totalPages})`)
        .setDescription(currentLinks.map((link, i) => `**${start + i + 1}.** [File](${link})`).join('\n') || '*No files found.*')
        .setColor(0x3498db)
        .setTimestamp();
}
async function sendLogEmbed(interaction, title, description, color) {
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
        .setName('upload_list')
        .setDescription('List all uploaded files (admin only)'),
    async execute(interaction) {
        if (!config.admins.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const ftp = new FTPClient();
        ftp.ftp.verbose = false;
        try {
            await ftp.access({
                host: process.env.FTP_HOST,
                port: Number(process.env.FTP_PORT),
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS
            });
            await ftp.cd(FTP_DIRECTORY);
            const files = await ftp.list();
            const links = files
                .filter(f => f.isFile)
                .map(f => `${UPLOAD_DOMAIN}/${f.name}`)
                .sort();
            if (links.length === 0) {
                await interaction.editReply('❌ No files found on the server.');
                return;
            }
            let page = 0;
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true), new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(links.length <= PER_PAGE));
            const message = await interaction.editReply({
                embeds: [createEmbed(links, page)],
                components: [row]
            });
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 90_000
            });
            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: '❌ You cannot interact with this.', ephemeral: true });
                    return;
                }
                if (i.customId === 'prev')
                    page--;
                else if (i.customId === 'next')
                    page++;
                row.components[0].setDisabled(page === 0);
                row.components[1].setDisabled((page + 1) * PER_PAGE >= links.length);
                await i.update({
                    embeds: [createEmbed(links, page)],
                    components: [row]
                });
            });
            collector.on('end', async () => {
                await interaction.editReply({ components: [] });
            });
            await sendLogEmbed(interaction, '📘 Upload List Accessed', `User <@${interaction.user.id}> accessed the upload list.`, 0x95a5a6);
        }
        catch (err) {
            console.error('❌ FTP list error:', err);
            await interaction.editReply('❌ Failed to fetch file list from FTP.');
            await sendLogEmbed(interaction, '❌ FTP List Error', `An error occurred during file listing by <@${interaction.user.id}>.`, 0xe74c3c);
        }
        finally {
            ftp.close();
        }
    }
};
