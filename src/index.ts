import Discord from 'discord.js';
const { Client, GatewayIntentBits, MessageFlags } = Discord;

import dotenv from 'dotenv';
import ftp from 'basic-ftp';
import { fetch } from 'undici';
import { createWriteStream, unlinkSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import type { ChatInputCommandInteraction } from 'discord.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const allowedUsers = process.env.ALLOWED_USERS?.split(',') || [];

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const typedInteraction = interaction as ChatInputCommandInteraction;

  if (typedInteraction.commandName !== 'upload') return;

  if (!allowedUsers.includes(typedInteraction.user.id)) {
    await typedInteraction.reply({
      content: '❌ Tu n’es pas autorisé à utiliser cette commande.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const file = typedInteraction.options.getAttachment('fichier');
  const url = typedInteraction.options.getString('lien');

  if (!file && !url) {
    await typedInteraction.reply({
      content: '❌ Tu dois fournir un fichier ou un lien.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await typedInteraction.deferReply();

  const downloadUrl = file?.url ?? url!;
  const extension = path.extname(file?.name ?? url!) || '.bin';
  const filename = `upload_${randomUUID().slice(0, 8)}${extension}`;
  const tempPath = path.join(tmpdir(), filename);

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    await typedInteraction.editReply('❌ Échec du téléchargement.');
    return;
  }

  const stream = createWriteStream(tempPath);
  await pipeline(Readable.fromWeb(res.body), stream);

  const clientFtp = new ftp.Client();
  clientFtp.ftp.verbose = true;

  try {
    console.log("🔌 Connexion FTP...");
    await clientFtp.access({
      host: process.env.FTP_HOST!,
      port: Number(process.env.FTP_PORT!),
      user: process.env.FTP_USER!,
      password: process.env.FTP_PASS!,
    });

    console.log("📂 Déjà dans le bon dossier (FTP root = public_html/i)");

    await clientFtp.uploadFrom(tempPath, filename);
    console.log(`✅ Fichier uploadé avec succès : ${filename}`);

    const uploadedList = await clientFtp.list();
    console.log("📄 Contenu du dossier après upload :");
    uploadedList.forEach(entry => console.log(`- ${entry.name}`));

    await typedInteraction.editReply(`✅ Fichier uploadé : ${process.env.UPLOAD_DOMAIN}/${filename}`);
  } catch (err) {
    console.error("❌ Erreur FTP :", err);
    await typedInteraction.editReply('❌ Erreur lors de l’envoi FTP.');
  } finally {
    clientFtp.close();
    try {
      unlinkSync(tempPath);
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
