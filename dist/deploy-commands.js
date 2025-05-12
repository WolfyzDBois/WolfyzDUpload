import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commands = [];
const basePath = path.join(__dirname);
function getAllJsFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            files.push(...getAllJsFiles(fullPath));
        }
        else if (stat.isFile() &&
            entry.endsWith('.js') &&
            !entry.startsWith('index') &&
            !entry.startsWith('deploy-commands')) {
            files.push(fullPath);
        }
    }
    return files;
}
const jsFiles = getAllJsFiles(basePath);
for (const filePath of jsFiles) {
    try {
        const fileUrl = pathToFileURL(filePath).href;
        const { command } = await import(fileUrl);
        if (command && command.data) {
            commands.push(command.data.toJSON());
        }
    }
    catch (err) {
        console.warn(`⚠️ Skipping file ${filePath}:`, err);
    }
}
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log(`🌀 Deploying ${commands.length} slash commands...`);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Slash commands successfully registered.');
    }
    catch (error) {
        console.error('❌ Error during slash command registration:', error);
    }
})();
