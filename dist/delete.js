import { SlashCommandBuilder } from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
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
        .setName('delete')
        .setDescription('Delete a file by its URL (admin only)')
        .addStringOption(option => option
        .setName('link')
        .setDescription('Full URL to the file')
        .setRequired(true)),
    async execute(interaction) {
        if (!adminList.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
                ephemeral: true,
            });
            return;
        }
        const url = interaction.options.getString('link', true);
        const filename = path.basename(new URL(url).pathname);
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
            await ftp.remove(filename);
            await interaction.reply({
                content: `✅ File \`${filename}\` has been deleted.`,
                ephemeral: true,
            });
            await sendLog(interaction, `🗑️ File deleted by <@${interaction.user.id}>: ${filename}`);
        }
        catch (err) {
            console.error('FTP delete error:', err);
            await interaction.reply({
                content: '❌ Failed to delete file on the FTP server.',
                ephemeral: true,
            });
        }
        finally {
            ftp.close();
        }
    },
};
