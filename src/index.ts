import Discord from 'discord.js';
const { Client, GatewayIntentBits, MessageFlags } = Discord;

import dotenv from 'dotenv';
import ftp from 'basic-ftp';
import { fetch } from 'undici';
import { createWriteStream, unlinkSync, readFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import type { ChatInputCommandInteraction } from 'discord.js';

dotenv.config();

// Charger les utilisateurs autorisés depuis user.json
const userConfig = JSON.parse(readFileSync('user.json', 'utf-8'));
const allowedUsers: string[] = userConfig.allowed_users;

const LOG_CHANNEL_ID = '1371116785595711508';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function sendLog(message: string) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (channel && channel.isTextBased()) {
    channel.send(message).catch(console.error);
  }
}

client.once('ready', async () => {
  const tag = client.user?.tag ?? 'inconnu';
  console.log(`✅ Connecté en tant que ${tag}`);
  await sendLog(`✅ Le bot **${tag}** a démarré.`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const typedInteraction = interaction as ChatInputCommandInteraction;

  if (typedInteraction.commandName !== 'upload') return;

  await sendLog(`📥 Commande /upload utilisée par <@${typedInteraction.user.id}>`);

  if (!allowedUsers.includes(typedInteraction.user.id)) {
    await typedInteraction.reply({
      content: '❌ Tu n’es pas autorisé à utiliser cette commande.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const file = typedInteraction.options.getAttachment('fichier');
  const url = typedInteraction.options.getString('lien');
  const customName = typedInteraction.options.getString('name');

  if (!file && !url) {
    await typedInteraction.reply({
      content: '❌ Tu dois fournir un fichier ou un lien.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await typedInteraction.deferReply();

  const downloadUrl = file?.url ?? url!;
  const originalName = file?.name ?? url ?? 'file.unknown';
  const extension = path.extname(originalName) || '.bin';
  const filename = `${customName || `upload_${randomUUID().slice(0, 8)}`}${extension}`;
  const tempPath = path.join(tmpdir(), filename);

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    await typedInteraction.editReply('❌ Échec du téléchargement.');
    return;
  }

  const stream = createWriteStream(tempPath);
  await pipeline(Readable.fromWeb(res.body), stream);

  const clientFtp = new ftp.Client();
  clientFtp.ftp.verbose = false;

  try {
    await clientFtp.access({
      host: process.env.FTP_HOST!,
      port: Number(process.env.FTP_PORT!),
      user: process.env.FTP_USER!,
      password: process.env.FTP_PASS!,
    });

    await clientFtp.uploadFrom(tempPath, filename);

    const finalUrl = `${process.env.UPLOAD_DOMAIN}/${filename}`;
    await typedInteraction.editReply(`✅ Fichier uploadé : ${finalUrl}`);
    await sendLog(`✅ Fichier uploadé par <@${typedInteraction.user.id}> : ${finalUrl}`);
  } catch (err) {
    console.error("❌ Erreur FTP :", err);
    await typedInteraction.editReply('❌ Erreur lors de l’envoi FTP.');
    await sendLog(`❌ Erreur FTP pendant l'upload demandé par <@${typedInteraction.user.id}>`);
  } finally {
    clientFtp.close();
    try {
      unlinkSync(tempPath);
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
