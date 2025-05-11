import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: './config/.env' });
const config = JSON.parse(readFileSync('./config/config.json', 'utf-8'));
const adminList = config.admins;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
async function sendLog(interaction, message) {
    try {
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(message);
        }
    }
    catch (err) {
        console.warn('Unable to send log:', err);
    }
}
function generateEmbed(links, page, perPage) {
    const totalPages = Math.ceil(links.length / perPage);
    const start = page * perPage;
    const end = start + perPage;
    const pageLinks = links.slice(start, end);
    return new EmbedBuilder()
        .setTitle(`📂 Liste des fichiers (page ${page + 1}/${totalPages})`)
        .setDescription(pageLinks.map((link, i) => `**${start + i + 1}.** [Fichier](${link})`).join('\n') || '*Aucun fichier*')
        .setColor(0x00AEFF);
}
export const command = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all heberged files (admin only)'),
    async execute(interaction) {
        if (!adminList.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You\'re not allowed to use this command.',
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const ftp = new FTPClient();
        ftp.ftp.verbose = false;
        const perPage = 20;
        try {
            await ftp.access({
                host: process.env.FTP_HOST,
                port: Number(process.env.FTP_PORT),
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
            });
            await ftp.cd(process.env.FTP_DIRECTORY || '/');
            const files = await ftp.list();
            const links = files
                .filter(file => file.isFile)
                .map(file => `${process.env.UPLOAD_DOMAIN}/${file.name}`);
            if (links.length === 0) {
                await interaction.editReply('No file found.');
                return;
            }
            let page = 0;
            const embed = generateEmbed(links, page, perPage);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true), new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(links.length <= perPage));
            const reply = await interaction.editReply({ embeds: [embed], components: [row] });
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60_000,
            });
            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: '❌ You\'re not allowed to interact with this.', ephemeral: true });
                    return;
                }
                if (i.customId === 'prev')
                    page--;
                if (i.customId === 'next')
                    page++;
                const newEmbed = generateEmbed(links, page, perPage);
                row.components[0].setDisabled(page <= 0);
                row.components[1].setDisabled((page + 1) * perPage >= links.length);
                await i.update({ embeds: [newEmbed], components: [row] });
            });
            collector.on('end', async () => {
                await interaction.editReply({ components: [] });
            });
            await sendLog(interaction, `📂 /list used by <@${interaction.user.id}>`);
        }
        catch (err) {
            console.error('FTP list error:', err);
            await interaction.editReply('❌ Impossible to list FTP files.');
        }
        finally {
            ftp.close();
        }
    },
};
