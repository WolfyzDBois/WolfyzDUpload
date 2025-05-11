import { SlashCommandBuilder } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: './config/.env' });
const adminList = JSON.parse(readFileSync('./config/admin.json', 'utf-8')).admins;
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
export const command = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List files hosted on the FTP server (admin only)'),
    async execute(interaction) {
        if (!adminList.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true }); // Important pour éviter expiration
        const ftp = new FTPClient();
        ftp.ftp.verbose = false;
        try {
            await ftp.access({
                host: process.env.FTP_HOST,
                port: Number(process.env.FTP_PORT),
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
            });
            await ftp.cd(process.env.FTP_DIRECTORY || '/');
            const files = await ftp.list();
            const fileLinks = files
                .filter(file => file.isFile)
                .map(file => `${process.env.UPLOAD_DOMAIN}/${file.name}`);
            const response = fileLinks.length > 0 ? fileLinks.join('\n') : 'No files found.';
            await interaction.editReply(response);
            await sendLog(interaction, `📂 /list used by <@${interaction.user.id}>`);
        }
        catch (err) {
            console.error('FTP list error:', err);
            await interaction.editReply('❌ Failed to list files on the FTP server.');
        }
        finally {
            ftp.close();
        }
    },
};
