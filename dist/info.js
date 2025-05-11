import { SlashCommandBuilder, EmbedBuilder, } from 'discord.js';
import { readFileSync } from 'fs';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
dotenv.config({ path: './config/.env' });
const config = JSON.parse(readFileSync('./config/config.json', 'utf-8'));
const admins = config.admins;
const users = config.allowed_users;
const redirectUsers = config.allowed_redirect;
const servers = config.allowed_servers;
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
function formatUserList(userIds) {
    return userIds.map(id => `- <@${id}>`).join('\n') || '*None*';
}
function formatServerList(interaction, serverIds) {
    const client = interaction.client;
    return serverIds
        .map(id => {
        const g = client.guilds.cache.get(id);
        return g ? `- ${g.name} : ${id}` : `- Unknown : ${id}`;
    })
        .join('\n') || '*None*';
}
export const command = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Show bot configuration and statistics (admin only)'),
    async execute(interaction) {
        if (!admins.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const ftp = new FTPClient();
        ftp.ftp.verbose = false;
        let uploadCount = 0;
        let redirectCount = 0;
        try {
            await ftp.access({
                host: process.env.FTP_HOST,
                port: Number(process.env.FTP_PORT),
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
            });
            await ftp.cd(process.env.FTP_DIRECTORY || '/');
            const allFiles = await ftp.list();
            uploadCount = allFiles.filter(f => f.isFile && !f.name.endsWith('.html')).length;
            await ftp.cd('redirect').catch(() => { }); // might not exist
            const redirectFiles = await ftp.list().catch(() => []);
            redirectCount = redirectFiles.filter(f => f.isFile).length;
        }
        catch (err) {
            console.warn('FTP error during /info stats:', err);
        }
        finally {
            ftp.close();
        }
        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Configuration & Stats')
            .setColor(0x3498db)
            .addFields({
            name: '📁 Uploads',
            value: `Total uploaded files: **${uploadCount}**`,
            inline: true,
        }, {
            name: '🔗 Redirections',
            value: `Total redirect pages: **${redirectCount}**`,
            inline: true,
        }, {
            name: '🛡️ Admins',
            value: formatUserList(admins),
        }, {
            name: '📤 Upload Access',
            value: formatUserList(users),
        }, {
            name: '🔀 Redirect Access (servers)',
            value: servers.map((id) => `- ${id}`).join('\n') || '*None*',
        }, {
            name: '📡 Authorized Redirect Servers',
            value: formatServerList(interaction, redirectUsers),
        })
            .setFooter({ text: `Log channel ID: ${LOG_CHANNEL_ID}` })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        await sendLog(interaction, `ℹ️ /info used by <@${interaction.user.id}>`);
    },
};
