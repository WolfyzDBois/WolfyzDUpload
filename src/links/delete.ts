import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';
import { Client as FTPClient } from 'basic-ftp';
import dotenv from 'dotenv';
import config from '@config';

dotenv.config({ path: './src/config/.env' });

const adminList = config.admins;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const FTP_DIR = process.env.FTP_DIR || '/redirect';

async function sendLogEmbed(interaction: ChatInputCommandInteraction, title: string, description: string, color: number) {
  const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
  if (logChannel?.isTextBased() && 'send' in logChannel) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  }
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('links_delete')
    .setDescription('Delete a redirection (admin only)')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The redirection name (e.g. github)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const name = interaction.options.getString('name', true);

    if (!adminList.includes(userId)) {
      await interaction.reply({ content: '❌ You are not authorized.', ephemeral: true });
      return;
    }

    const filename = `${name}.html`;
    const ftp = new FTPClient();
    ftp.ftp.verbose = false;

    try {
      await ftp.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT!),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
      });

      await ftp.ensureDir(FTP_DIR);
      await ftp.remove(`${FTP_DIR}/${filename}`);

      await interaction.reply({
        content: `🗑️ Redirection \`${name}\` deleted successfully.`,
        ephemeral: true
      });

      await sendLogEmbed(
        interaction,
        '🗑️ Redirection Deleted',
        `<@${userId}> deleted redirect \`${name}\``,
        0xe67e22
      );
    } catch (err) {
      console.error('❌ FTP delete redirect error:', err);
      await interaction.reply({
        content: '❌ Failed to delete the redirection.',
        ephemeral: true
      });

      await sendLogEmbed(
        interaction,
        '❌ Redirection Deletion Failed',
        `Failed attempt by <@${userId}> to delete redirect \`${name}\``,
        0xe74c3c
      );
    } finally {
      ftp.close();
    }
  }
};
