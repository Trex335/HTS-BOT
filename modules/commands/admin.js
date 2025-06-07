// modules/commands/admin.js - UPDATED with more robust ID validation

const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "admin",
        aliases: ["a", "adm"],
        credits: "Hassan",
        description: "Manages bot administrators (list, add, remove).",
        usage: "admin list OR admin add <user ID> OR admin remove <user ID>",
        commandCategory: "Admin", // Ensure this matches index.js's expectation
        hasPermssion: 1, // Only actual administrators can use this command
        usePrefix: true, // Requires prefix
        cooldown: 5
    },
    run: async function({ api, event, args, global }) {
        const { threadID, messageID, senderID } = event;
        const configPath = path.join(global.client.mainPath, 'config.json'); // Path to your config.json

        // Check if the user is an ADMINBOT (using the live global.config.ADMINBOT)
        if (!global.config.ADMINBOT.includes(senderID)) {
            return api.sendMessage("You don't have permission to use this command. Only bot administrators can use it.", threadID, messageID);
        }

        const subCommand = args[0]?.toLowerCase();

        // Helper function for more robust ID validation
        const isValidFacebookID = (idString) => {
            // Check if it's not empty and contains only digits
            return idString && /^\d+$/.test(idString);
        };

        switch (subCommand) {
            case "list":
                await global.utils.humanDelay(); // Add human delay
                let adminList = global.config.ADMINBOT; // Access the live array
                if (adminList.length === 0) {
                    return api.sendMessage("There are no registered administrators.", threadID, messageID);
                }

                let message = "🤖 **Bot Administrators:**\n";
                for (let i = 0; i < adminList.length; i++) {
                    const adminID = adminList[i];
                    message += `${i + 1}. ${adminID}\n`;
                }
                api.sendMessage(message, threadID, messageID);
                break;

            case "add":
                if (args.length < 2) {
                    return api.sendMessage("Please provide a user ID to add. Usage: `admin add <user ID>`", threadID, messageID);
                }
                const newAdminID = args[1].trim();

                // Modified validation for ID
                if (!isValidFacebookID(newAdminID)) {
                    return api.sendMessage("Invalid User ID format. Please provide a numeric Facebook User ID (e.g., '100001234567890').", threadID, messageID);
                }

                // Check against the live global.config.ADMINBOT
                if (global.config.ADMINBOT.includes(newAdminID)) {
                    return api.sendMessage(`User ID ${newAdminID} is already an administrator.`, threadID, messageID);
                }

                // 1. Add to the live global.config.ADMINBOT array
                global.config.ADMINBOT.push(newAdminID);
                // Also update global.adminMode.adminUserIDs directly if you prefer
                global.adminMode.adminUserIDs.push(newAdminID);

                try {
                    // 2. Read, modify, and write the config.json file
                    let currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    currentConfig.ADMINBOT.push(newAdminID); // Add to the config object that will be written
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');

                    await global.utils.humanDelay(); // Add human delay
                    api.sendMessage(`✅ User ID ${newAdminID} has been added as an administrator. No bot restart/redeploy required for this change to take effect!`, threadID, messageID);
                } catch (error) {
                    console.error("Error adding admin and saving config:", error);
                    // If saving to file fails, remove from in-memory array to keep them in sync
                    global.config.ADMINBOT = global.config.ADMINBOT.filter(id => id !== newAdminID);
                    global.adminMode.adminUserIDs = global.adminMode.adminUserIDs.filter(id => id !== newAdminID);
                    api.sendMessage(`❌ Failed to add administrator. Error: ${error.message}`, threadID, messageID);
                }
                break;

            case "remove":
            case "del": // Alias for remove
                if (args.length < 2) {
                    return api.sendMessage("Please provide a user ID to remove. Usage: `admin remove <user ID>`", threadID, messageID);
                }
                const removeAdminID = args[1].trim();

                // Modified validation for ID
                if (!isValidFacebookID(removeAdminID)) {
                    return api.sendMessage("Invalid User ID format. Please provide a numeric Facebook User ID to remove (e.g., '100001234567890').", threadID, messageID);
                }

                // Prevent self-removal
                if (removeAdminID === senderID) {
                    return api.sendMessage("You cannot remove yourself from the administrator list.", threadID, messageID);
                }

                // Check if the user to be removed is actually an admin
                if (!global.config.ADMINBOT.includes(removeAdminID)) {
                    return api.sendMessage(`User ID ${removeAdminID} is not currently an administrator.`, threadID, messageID);
                }

                // 1. Filter out the admin ID from the live global.config.ADMINBOT array
                global.config.ADMINBOT = global.config.ADMINBOT.filter(id => id !== removeAdminID);
                // Also update global.adminMode.adminUserIDs directly
                global.adminMode.adminUserIDs = global.adminMode.adminUserIDs.filter(id => id !== removeAdminID);

                try {
                    // 2. Read, modify, and write the config.json file
                    let currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    currentConfig.ADMINBOT = currentConfig.ADMINBOT.filter(id => id !== removeAdminID); // Filter the config object
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');

                    await global.utils.humanDelay(); // Add human delay
                    api.sendMessage(`🗑️ User ID ${removeAdminID} has been removed from the administrator list. No bot restart/redeploy required!`, threadID, messageID);
                } catch (error) {
                    console.error("Error removing admin and saving config:", error);
                    // If saving to file fails, re-add to in-memory array to maintain consistency
                    global.config.ADMINBOT.push(removeAdminID);
                    global.adminMode.adminUserIDs.push(removeAdminID);
                    api.sendMessage(`❌ Failed to remove administrator. Error: ${error.message}`, threadID, messageID);
                }
                break;

            default:
                await global.utils.humanDelay(); // Add human delay
                api.sendMessage("Invalid sub-command. Usage:\n`admin list`\n`admin add <user ID>`\n`admin remove <user ID>`", threadID, messageID);
                break;
        }
    }
};
