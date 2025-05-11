import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands: any[] = [];
const srcPath = path.join(__dirname);

const files = readdirSync(srcPath).filter(file =>
  file.endsWith('.js') &&
  file !== 'index.js' &&
  file !== path.basename(__filename)
);

for (const file of files) {
  const filePath = path.join(srcPath, file);
  const fileUrl = pathToFileURL(filePath).href;
  const { command } = await import(fileUrl);

  if (command && command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('🌀 Deploying slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );
    console.log('✅ Commands successfully registered.');
  } catch (error) {
    console.error('❌ Error during command registration:', error);
  }
})();
