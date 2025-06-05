const axios = require('axios'); // For fetching content from URLs
const fs = require('fs-extra'); // For file system operations (saving the file)
const path = require('path');   // For resolving file paths

module.exports = {
  config: {
    name: "install",
    version: "1.0.0",
    hasPermssion: 1, // ONLY ADMINBOT can use this command for security reasons
    credits: "Hassan", // Or "Hassan Bot Development Team"
    description: "Installs a new command module from a URL. USE WITH EXTREME CAUTION!",
    commandCategory: "Admin", // Put in Admin category
    usages: "install <fileName.js> <direct_url_to_raw_js>",
    cooldowns: 10, // Longer cooldown due to sensitive nature
    usePrefix: true // This command should typically use a prefix
  },

  run: async function ({ api, event, args, global }) {
    const [fileName, fileUrl] = args;

    if (!fileName || !fileUrl) {
      return api.sendMessage(
        `Usage: ${global.config.PREFIX}install <fileName.js> <direct_url_to_raw_js>\n` +
        `Example: ${global.config.PREFIX}install mycommand.js https://pastebin.com/raw/xxxxxxxx\n\n` +
        `⚠️ WARNING: Only install files from trusted sources! Installing malicious code can compromise your bot and Facebook account.`,
        event.threadID,
        event.messageID
      );
    }

    if (!fileName.endsWith('.js')) {
        return api.sendMessage("Error: The file name must end with '.js'.", event.threadID, event.messageID);
    }

    if (!/^https?:\/\//.test(fileUrl)) {
        return api.sendMessage("Error: The URL must start with 'http://' or 'https://'.", event.threadID, event.messageID);
    }

    api.sendMessage(
      `Attempting to install "${fileName}" from "${fileUrl}"...\n\n` +
      `⚠️ REMINDER: You are responsible for verifying the safety of this code. If this is a new command, a bot restart will be required for it to load.`,
      event.threadID,
      event.messageID
    );

    try {
      const response = await axios.get(fileUrl);
      const fileContent = response.data;

      const commandsPath = path.join(global.client.mainPath, 'modules', 'commands');
      const filePath = path.join(commandsPath, fileName);

      await fs.writeFile(filePath, fileContent, 'utf8');

      api.sendMessage(
        `✅ Successfully installed "${fileName}"!\n` +
        `A bot restart is required for this new command to be loaded and become active.` +
        `\nTo restart the bot, you'll need to redeploy it on your hosting platform (e.g., Render).`,
        event.threadID,
        event.messageID
      );
      logger.log(`Installed new command: ${fileName} from ${fileUrl}`, "INSTALL_CMD");

    } catch (error) {
      logger.err(`Failed to install ${fileName}: ${error.message}`, "INSTALL_CMD_FAIL");
      let errorMessage = `Failed to install "${fileName}". Error: ${error.message}`;
      if (error.response) {
          errorMessage += ` (HTTP Status: ${error.response.status})`;
      }
      api.sendMessage(errorMessage, event.threadID, event.messageID);
    }
  }
};
