import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import ftp from 'basic-ftp';
import config from '@config';
import dotenv from 'dotenv';

dotenv.config({ path: './src/config/.env' });

const FTP_DIR = process.env.FTP_DIRECTORY || '/tags';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;

export const command = {
  data: new SlashCommandBuilder()
    .setName('messages_delete')
    .setDescription('Delete a saved tag from the FTP server')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The name of the tag to delete')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const guildId = interaction.guildId;

    if (!guildId || !config.allowed_tags.includes(guildId)) {
      await interaction.reply({
        content: '❌ You are not authorized to delete tags in this server.',
        ephemeral: true,
      });
      return;
    }

    const ftpClient = new ftp.Client();
    ftpClient.ftp.verbose = false;

    try {
      await ftpClient.access({
        host: process.env.FTP_HOST!,
        port: Number(process.env.FTP_PORT || 21),
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASS!,
        secure: false,
      });

      await ftpClient.remove(`${FTP_DIR}/${name}.json`);

      await interaction.reply({
        content: `🗑️ Tag \`${name}\` has been deleted.`,
        ephemeral: true,
      });

      const log = new EmbedBuilder()
        .setTitle('🗑️ Tag Deleted')
        .setDescription(`Tag \`${name}\` deleted by <@${interaction.user.id}>`)
        .setColor(0xe67e22)
        .setTimestamp();

      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send({ embeds: [log] });
      }
    } catch (err) {
      console.error('❌ FTP deletion error:', err);
      await interaction.reply({
        content: '❌ Could not delete this tag. It may not exist.',
        ephemeral: true,
      });

      const errorLog = new EmbedBuilder()
        .setTitle('❌ Tag Deletion Failed')
        .setDescription(`Failed to delete tag \`${name}\` by <@${interaction.user.id}>`)
        .setColor(0xe74c3c)
        .setTimestamp();

      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send({ embeds: [errorLog] });
      }
    } finally {
      ftpClient.close();
    }
  }
};
