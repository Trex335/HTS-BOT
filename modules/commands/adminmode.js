module.exports = {
    config: {
        name: "adminmode",
        aliases: ["am"],
        version: "1.0",
        hasPermssion: 1, // Only admins can use this command
        credits: "Hassan",
        description: "Toggles the bot's global admin-only mode.",
        commandCategory: "Admin",
        usages: "[on/off]",
        cooldowns: 5,
        usePrefix: true // This command should use a prefix
    },
    run: async function({ api, event, args, global }) {
        const status = args[0]?.toLowerCase();

        if (!status) {
            return api.sendMessage(`Current Admin-only mode status: ${global.adminMode.enabled ? "ON" : "OFF"}.\nUsage: ${global.config.PREFIX}adminmode [on/off]`, event.threadID);
        }

        if (status === "on") {
            if (global.adminMode.enabled) {
                return api.sendMessage("Admin-only mode is already ON.", event.threadID);
            }
            global.adminMode.enabled = true;
            return api.sendMessage("🔒 Admin-only mode has been turned ON. Only admins can use commands now.", event.threadID);
        } else if (status === "off") {
            if (!global.adminMode.enabled) {
                return api.sendMessage("Admin-only mode is already OFF.", event.threadID);
            }
            global.adminMode.enabled = false;
            return api.sendMessage("🔓 Admin-only mode has been turned OFF. All users can use commands now.", event.threadID);
        } else {
            return api.sendMessage("Invalid usage. Please use 'on' or 'off'. Example: ?adminmode on", event.threadID);
        }
    }
};
