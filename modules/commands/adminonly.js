const fs = require('fs'); // Required for file operations (used by global.client.saveConfig)
const path = require('path'); // Required for path operations (used by global.client.saveConfig)

module.exports = {
    config: {
        name: 'adminonly', // The command name your bot will recognize (e.g., -adminonly)
        version: '1.0.0',
        hasPermssion: 2, // IMPORTANT: Set to 2 (bot admin only)
        credits: 'Hassan, // CHANGE THIS TO YOUR NAME!
        description: 'Toggles admin-only mode for the bot. When enabled, only ADMINBOT IDs can use commands.',
        commandCategory: 'Admin', // Categorize under Admin
        usages: '-adminonly',
        cooldowns: 5,
        usePrefix: true // This command uses the bot's prefix
    },

    // The 'run' function signature must match what your index.js passes
    run: async function ({ api, event, args, global }) {
        const senderId = event.senderID;
        const threadID = event.threadID;

        // Step 1: Check if the sender is a bot administrator
        // This relies on your global.config.ADMINBOT array being correctly populated.
        if (!global.config.ADMINBOT.includes(senderId)) {
            return api.sendMessage("You do not have permission to use this command. Only bot administrators can toggle admin-only mode.", threadID, event.messageID);
        }

        // Step 2: Toggle the 'adminOnly' status in the in-memory global config
        global.config.adminOnly = !global.config.adminOnly;

        // Step 3: Save the updated configuration to the config.json file
        // This uses the new saveConfig function we added to global.client in index.js
        const saveSuccess = global.client.saveConfig();

        let message = `Admin-only mode has been ${global.config.adminOnly ? '✅ ENABLED' : '❌ DISABLED'}.`;
        if (global.config.adminOnly) {
            message += "\nNow, only bot administrators can use commands.";
        } else {
            message += "\nAll users can now use commands.";
        }

        // Inform the user if saving failed (though it should be rare if permissions are correct)
        if (!saveSuccess) {
            message += "\nHowever, failed to save the configuration to file. Changes might be lost on bot restart.";
            global.loading.err("Admin-only mode changed but config save failed.", "ADMINONLY_SAVE");
        } else {
             global.loading.log(`Admin-only mode set to: ${global.config.adminOnly}`, "ADMINONLY_TOGGLE");
        }
        
        return api.sendMessage(message, threadID, event.messageID);
    }
};
