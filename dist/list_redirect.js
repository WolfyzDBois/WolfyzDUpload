import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Writable } from 'stream';
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
function streamToBuffer() {
    const chunks = [];
    const writable = new Writable({
        write(chunk, _encoding, callback) {
            chunks.push(chunk);
            callback();
        },
    });
    return {
        writable,
        getBuffer: () => Buffer.concat(chunks),
    };
}
function parseRedirectTarget(content) {
    const match = content.match(/url=(.*?)"/);
    return match ? match[1] : null;
}
function generateEmbed(redirects, page, perPage) {
    const totalPages = Math.ceil(redirects.length / perPage);
    const start = page * perPage;
    const end = start + perPage;
    const pageLinks = redirects.slice(start, end);
    return new EmbedBuilder()
        .setTitle(`🔗 Redirect List (page ${page + 1}/${totalPages})`)
        .setDescription(pageLinks.map(entry => `\`${entry.name}\` : ${entry.url}`).join('\n') || '*No redirection found*')
        .setColor(0x00aeff);
}
export const command = {
    data: new SlashCommandBuilder()
        .setName('list_redirect')
        .setDescription('List all redirects (admin only)'),
    async execute(interaction) {
        if (!adminList.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
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
            await ftp.cd(process.env.FTP_DIR || '/');
            await ftp.cd('redirect');
            const files = await ftp.list();
            const redirects = [];
            for (const file of files) {
                if (!file.isFile || !file.name.endsWith('.html'))
                    continue;
                const name = file.name.replace('.html', '');
                const { writable, getBuffer } = streamToBuffer();
                await ftp.downloadTo(writable, file.name);
                const content = getBuffer().toString();
                const url = parseRedirectTarget(content);
                if (url) {
                    redirects.push({ name, url });
                }
            }
            if (redirects.length === 0) {
                await interaction.editReply('No redirection found.');
                return;
            }
            let page = 0;
            const embed = generateEmbed(redirects, page, perPage);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true), new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(redirects.length <= perPage));
            const reply = await interaction.editReply({ embeds: [embed], components: [row] });
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60_000,
            });
            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: '❌ You can’t use these buttons.', ephemeral: true });
                    return;
                }
                if (i.customId === 'prev')
                    page--;
                if (i.customId === 'next')
                    page++;
                const newEmbed = generateEmbed(redirects, page, perPage);
                row.components[0].setDisabled(page <= 0);
                row.components[1].setDisabled((page + 1) * perPage >= redirects.length);
                await i.update({ embeds: [newEmbed], components: [row] });
            });
            collector.on('end', async () => {
                await interaction.editReply({ components: [] });
            });
            await sendLog(interaction, `📄 /list_redirect used by <@${interaction.user.id}>`);
        }
        catch (err) {
            console.error('FTP list_redirect error:', err);
            await interaction.editReply('❌ Failed to list redirect files.');
        }
        finally {
            ftp.close();
        }
    },
};
