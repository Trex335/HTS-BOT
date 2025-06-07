// modules/commands/admin.js

const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "admin",
        aliases: ["a", "adm"],
        description: "Manages bot administrators (list, add).",
        usage: "admin list OR admin add <user ID>",
        commandCategory: "Admin",
        hasPermssion: 1, // Only actual administrators can use this command
        usePrefix: true, // Requires prefix
        cooldown: 5
    },
    run: async function({ api, event, args, global }) {
        const { threadID, messageID, senderID } = event;
        const configPath = path.join(global.client.mainPath, 'config.json'); // Path to your config.json

        // Check if the user is an ADMINBOT
        if (!global.config.ADMINBOT.includes(senderID)) {
            return api.sendMessage("You don't have permission to use this command. Only bot administrators can use it.", threadID, messageID);
        }

        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case "list":
                await global.utils.humanDelay(); // Add human delay
                let adminList = global.config.ADMINBOT;
                if (adminList.length === 0) {
                    return api.sendMessage("There are no registered administrators.", threadID, messageID);
                }

                let message = "🤖 **Bot Administrators:**\n";
                for (let i = 0; i < adminList.length; i++) {
                    const adminID = adminList[i];
                    // You might want to try to get the user's name here if your bot has a way to store/retrieve names
                    message += `${i + 1}. ${adminID}\n`;
                }
                api.sendMessage(message, threadID, messageID);
                break;

            case "add":
                if (args.length < 2) {
                    return api.sendMessage("Please provide a user ID to add. Usage: `admin add <user ID>`", threadID, messageID);
                }
                const newAdminID = args[1].trim();

                // Basic validation for ID (can be improved)
                if (isNaN(newAdminID)) {
                    return api.sendMessage("Invalid User ID. Please provide a numeric Facebook User ID.", threadID, messageID);
                }

                if (global.config.ADMINBOT.includes(newAdminID)) {
                    return api.sendMessage(`User ID ${newAdminID} is already an administrator.`, threadID, messageID);
                }

                // Add the new admin ID
                global.config.ADMINBOT.push(newAdminID);

                try {
                    // Read, modify, and write the config.json file
                    let currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    currentConfig.ADMINBOT.push(newAdminID);
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');

                    await global.utils.humanDelay(); // Add human delay
                    api.sendMessage(`✅ User ID ${newAdminID} has been added as an administrator. The bot will restart to apply changes.`, threadID, messageID);
                    // It's crucial to restart the bot to reload the config and apply admin changes.
                    // A simple exit with 1 will trigger a restart on most hosting platforms.
                    setTimeout(() => process.exit(1), 5000); // Exit after 5 seconds
                } catch (error) {
                    console.error("Error adding admin and saving config:", error);
                    api.sendMessage(`❌ Failed to add administrator. Error: ${error.message}`, threadID, messageID);
                }
                break;

            default:
                await global.utils.humanDelay(); // Add human delay
                api.sendMessage("Invalid sub-command. Usage: `admin list` or `admin add <user ID>`", threadID, messageID);
                break;
        }
    }
};
