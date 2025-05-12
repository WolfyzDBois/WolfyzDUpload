import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import ftp from 'basic-ftp';
import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const FTP_HOST = process.env.FTP_HOST;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_DIR = process.env.FTP_DIRECTORY || '/tags';
const TEMP_DIR = path.resolve('./temp-tags');
export async function handleTagCreateModal(interaction) {
    if (interaction.customId !== 'tag_create_modal')
        return;
    const alias = interaction.fields.getTextInputValue('alias').trim();
    const isEmbed = interaction.fields.getTextInputValue('is_embed').trim().toLowerCase() === 'true';
    const title = interaction.fields.getTextInputValue('title').trim();
    const color = interaction.fields.getTextInputValue('color').trim();
    const markdown = interaction.fields.getTextInputValue('markdown').trim();
    const aliasRegex = /^[a-z0-9_]+$/;
    if (!aliasRegex.test(alias)) {
        return await interaction.reply({
            content: '❌ Invalid name. Use only lowercase letters, numbers, and underscores.',
            ephemeral: true,
        });
    }
    if (!fs.existsSync(TEMP_DIR))
        fs.mkdirSync(TEMP_DIR);
    const filePath = path.join(TEMP_DIR, `${alias}.json`);
    const tagData = { embed: isEmbed, title, color, markdown };
    fs.writeFileSync(filePath, JSON.stringify(tagData, null, 2));
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            port: Number(process.env.FTP_PORT || 21),
            secure: false,
        });
        await client.ensureDir(FTP_DIR);
        await client.uploadFrom(filePath, `${FTP_DIR}/${alias}.json`);
        await interaction.reply({
            content: `✅ Tag \`${alias}\` was successfully created and uploaded.`,
            ephemeral: true,
        });
        const embed = new EmbedBuilder()
            .setTitle('📌 Tag Created')
            .setDescription(`Tag \`${alias}\` created by <@${interaction.user.id}>`)
            .setColor(0x2ecc71)
            .setTimestamp();
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    }
    catch (err) {
        console.error('❌ FTP upload error:', err);
        await interaction.reply({
            content: '❌ Failed to upload the tag to the server.',
            ephemeral: true,
        });
        const embed = new EmbedBuilder()
            .setTitle('❌ Tag Upload Error')
            .setDescription(`An error occurred while uploading \`${alias}\` by <@${interaction.user.id}>.`)
            .setColor(0xe74c3c)
            .setTimestamp();
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    }
    finally {
        client.close();
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
    }
}
