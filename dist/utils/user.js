import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, } from 'discord.js';
export const command = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Display information about a user'),
    async execute(interaction) {
        try {
            const user = interaction.user;
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                return await interaction.reply({
                    content: '❌ Could not fetch member data.',
                    ephemeral: true,
                });
            }
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guildId)
                .map(role => `<@&${role.id}>`)
                .join(', ') || '*No roles*';
            const permissions = new PermissionsBitField(member.permissions.bitfield)
                .toArray()
                .join(', ') || '*None*';
            const embed = new EmbedBuilder()
                .setTitle(`👤 User Info: ${user.username}`)
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: '🆔 ID', value: user.id, inline: true }, { name: '📅 Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true }, { name: '🏷️ Mention', value: `<@${user.id}>`, inline: true }, { name: '🎭 Roles', value: roles }, { name: '🔐 Permissions', value: permissions })
                .setColor(0x3498db)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (err) {
            console.error('❌ Error in /user:', err);
            // Assure que si l'interaction a déjà eu une réponse, on utilise followUp
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ Failed to fetch user information.',
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: '❌ Failed to fetch user information.',
                    ephemeral: true,
                });
            }
        }
    },
};
