import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('upload')
    .setDescription('Upload un fichier ou un lien vers le FTP')
    .addAttachmentOption(opt => opt.setName('fichier').setDescription('Fichier à uploader').setRequired(false))
    .addStringOption(opt => opt.setName('lien').setDescription('Lien vers un fichier').setRequired(false))
    .addStringOption(opt => opt.setName('name').setDescription('Nom du fichier sans extension').setRequired(false))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: commands });
    console.log('✅ Commande enregistrée.');
  } catch (error) {
    console.error(error);
  }
})();
