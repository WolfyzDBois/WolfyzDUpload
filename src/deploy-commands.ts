import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

// Résout __dirname en mode ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Commandes à charger depuis src/
const commands: any[] = [];
const commandsPath = path.join(__dirname);
const commandFiles = ['upload.js', 'list.js', 'info.js', 'delete.js', 'stop.js'];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const { command } = await import(`file://${filePath}`);
  if (command && command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('🌀 Déploiement des commandes slash...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );
    console.log('✅ Commands register.');
  } catch (error) {
    console.error('❌ Error (register) :', error);
  }
})();
