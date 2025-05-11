import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: './config/.env' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.DISCORD_TOKEN;
const logChannelId = process.env.LOG_CHANNEL_ID;
const servers = JSON.parse(readFileSync('./config/servers.json', 'utf-8')).allowed_servers;
client.once('ready', async () => {
    console.log(`✅ Connecté en tant que ${client.user?.tag}`);
    const logChannel = await client.channels.fetch(logChannelId);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send(`✅ Bot started : ${client.user?.tag}`);
    }
});
client.on('guildCreate', async (guild) => {
    if (!servers.includes(guild.id)) {
        console.log(`❌ Not allowed server : ${guild.name} (${guild.id}). Disconnected.`);
        await guild.leave();
    }
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const commandPath = path.join(__dirname, `${interaction.commandName}.js`);
    try {
        const command = await import(`file://${commandPath}`);
        await command.command.execute(interaction);
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`📩 Commande \`/${interaction.commandName}\` utilisée par <@${interaction.user.id}>`);
        }
    }
    catch (error) {
        console.error(`❌ Error during execution of command /${interaction.commandName}`, error);
        await interaction.reply({ content: '❌ Error during execution of this command.', ephemeral: true });
    }
});
client.login(token);
