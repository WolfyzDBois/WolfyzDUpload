import { SlashCommandBuilder } from 'discord.js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
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
        .setName('stop')
        .setDescription('Arrête le bot (admin uniquement)'),
    async execute(interaction) {
        if (!adminList.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ Vous n’êtes pas autorisé à utiliser cette commande.',
                ephemeral: true,
            });
            return;
        }
        await interaction.reply({
            content: '🛑 Le bot est en cours d’arrêt...',
            ephemeral: true,
        });
        await sendLog(interaction, `🛑 Bot arrêté via /stop par <@${interaction.user.id}>`);
        process.exit(0);
    },
};
