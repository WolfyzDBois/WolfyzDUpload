import { ModalSubmitInteraction } from 'discord.js';
import fs from 'fs';
import path from 'path';
import ftp from 'basic-ftp';

const logChannelId = process.env.LOG_CHANNEL_ID!;
const ftpHost = "ftp.wolfyz.fr";
const ftpUser = "u266426828.upload";
const ftpPassword = "Mis45tig9ri!";
const remoteTagsDir = "/tags";

export async function handleTagCreateModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== 'tag_create_modal') return;

  const alias = interaction.fields.getTextInputValue('alias').trim();
  const isEmbed = interaction.fields.getTextInputValue('is_embed').trim().toLowerCase() === 'true';
  const title = interaction.fields.getTextInputValue('title').trim();
  const color = interaction.fields.getTextInputValue('color').trim();
  const markdown = interaction.fields.getTextInputValue('markdown').trim();

  const aliasRegex = /^[a-z0-9_]+$/;
  if (!aliasRegex.test(alias)) {
    return await interaction.reply({
      content: '❌ Invalid alias. Use only lowercase letters, numbers, and underscores.',
      ephemeral: true
    });
  }

  const tempDir = path.resolve('./temp-tags');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const filePath = path.join(tempDir, `${alias}.json`);
  const tagData = { embed: isEmbed, title, color, markdown };

  fs.writeFileSync(filePath, JSON.stringify(tagData, null, 2));

  // FTP upload
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: ftpHost,
      user: ftpUser,
      password: ftpPassword,
      secure: false
    });

    await client.ensureDir(remoteTagsDir);
    await client.uploadFrom(filePath, `${remoteTagsDir}/${alias}.json`);
    await interaction.reply({
      content: `✅ Tag \`${alias}\` has been successfully created and uploaded.`,
      ephemeral: true
    });

    // Logging
    const logChannel = await interaction.client.channels.fetch(logChannelId);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
      await logChannel.send(`📌 Tag \`${alias}\` was created by <@${interaction.user.id}>`);
    }
  } catch (err) {
    console.error('❌ FTP error:', err);
    await interaction.reply({
      content: '❌ Failed to upload the tag to the server.',
      ephemeral: true
    });
  } finally {
    client.close();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Clean local temp
  }
}
