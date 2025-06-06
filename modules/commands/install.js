const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    // This 'config' object contains metadata for your command, as expected by index.js.
    config: {
        name: 'install', // The command name your bot will recognize (e.g., -install)
        version: '1.0.2', // Updated version
        hasPermssion: 0, // 0 = everyone, 1 = group admin, 2 = bot admin. Adjust as needed.
        credits: 'Hassan', // IMPORTANT: Change this to your name or handle
        description: 'Installs a new command from a raw URL (Pastebin/Gist).',
        commandCategory: 'Admin', // This helps categorize your commands (e.g., 'Utility', 'Fun', 'Admin')
        usages: '-install <fileName.js> <rawURL>', // Example usage with hardcoded prefix
        cooldowns: 5, // Cooldown in seconds before the command can be used again
        usePrefix: true // Set to true if the command requires the bot's prefix
    },

    // The 'run' function signature MUST match what your index.js passes:
    // { api, event, args, global, prompt }
    run: async function ({ api, event, args, global, prompt }) { // Renamed from 'execute' to 'run' and matched signature
        const senderId = event.senderID; // Get senderId from event
        const threadID = event.threadID; // Get threadID from event for sending messages

        // --- Admin Check (Highly Recommended) ---
        // Ensure global.config.ADMINBOT is accessible and correct
        if (!global.config.ADMINBOT.includes(senderId)) {
            return api.sendMessage("You don't have permission to use this command.", threadID, event.messageID);
        }

        if (args.length !== 2) {
            // Provide a clear usage message. global.config.PREFIX is now accessible.
            return api.sendMessage(`Usage: ${global.config.PREFIX}install <fileName.js> <rawURL>\nExample: ${global.config.PREFIX}install mycmd.js https://gist.githubusercontent.com/user/gistid/raw/file.js`, threadID, event.messageID);
        }

        const fileName = args[0]; // The desired name for the new command file (e.g., "joke.js")
        const sourceUrl = args[1]; // The raw URL to fetch the command code from

        if (!fileName.endsWith('.js')) {
            return api.sendMessage(`Error: Invalid file name. It must end with '.js' (e.g., 'mycommand.js').`, threadID, event.messageID);
        }

        // Validate the source URL to ensure it's a raw Pastebin or raw GitHub Gist link
        if (!sourceUrl.startsWith('https://pastebin.com/raw/') && !sourceUrl.startsWith('https://gist.githubusercontent.com/')) {
            return api.sendMessage(`Error: Invalid URL. Please use a raw Pastebin URL (e.g., https://pastebin.com/raw/...) or a raw GitHub Gist URL (e.g., https://gist.githubusercontent.com/...).`, threadID, event.messageID);
        }

        try {
            api.sendMessage(`Attempting to install "${fileName}" from "${sourceUrl}"...`, threadID, event.messageID);
            global.loading.log(`[INSTALL] Fetching command content from: ${sourceUrl}`);

            // Fetch the content of the command file from the provided URL
            const response = await axios.get(sourceUrl, { responseType: 'text' });
            const commandCode = response.data; // The JavaScript code of the new command

            // Crucial safety reminder for the user
            api.sendMessage("⚠️ REMINDER: You are responsible for verifying the safety of this code. Only install from trusted sources!", threadID);

            // Construct the full path where the new command file will be saved.
            // `__dirname` inside `commands/install.js` correctly refers to the `modules/commands` directory.
            const commandFilePath = path.join(__dirname, fileName);
            
            // Write the fetched code to the new file
            fs.writeFileSync(commandFilePath, commandCode, 'utf8'); // Explicitly specify UTF-8 encoding
            global.loading.log(`[INSTALL] Successfully saved "${fileName}" to: ${commandFilePath}`);

            // Reload the newly installed command using global.client.loadCommand
            // This is the correct way to load a single command in your index.js setup.
            const success = await global.client.loadCommand(fileName);

            if (success) {
                const commandName = fileName.slice(0, -3).toLowerCase(); // Extract command name
                api.sendMessage(`✅ Command '${commandName}' (file: ${fileName}) installed and loaded successfully!`, threadID, event.messageID);
                global.loading.log(`[INSTALL] Command "${fileName}" successfully installed and loaded.`);
            } else {
                api.sendMessage(`❌ Command '${fileName}' was installed but failed to load. Check console for errors.`, threadID, event.messageID);
            }

        } catch (error) {
            global.loading.err(`[INSTALL_CMD_FAIL] Failed to install command "${fileName}":`, error);
            let errorMessage = `❌ Failed to install command '${fileName}'. Error: ${error.message}`;

            // Add more specific details for different types of errors (e.g., network errors, file system errors)
            if (error.response) {
                errorMessage += `\nHTTP Status: ${error.response.status || 'N/A'}`;
                if (error.response.data) {
                    const responseData = typeof error.response.data === 'object' 
                                       ? JSON.stringify(error.response.data) 
                                       : String(error.response.data);
                    errorMessage += `\nResponse Data: ${responseData.substring(0, 200)}${responseData.length > 200 ? '...' : ''}`;
                }
            } else if (error.code) {
                errorMessage += `\nSystem Error Code: ${error.code}`;
            }

            api.sendMessage(errorMessage, threadID, event.messageID);
        }
    },
};
