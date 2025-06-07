const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "delete",
  version: "1.0.0",
  hasPermssion: 1, // Admins only
  credits: "Hassan",
  description: "Deletes a command module file (e.g., help.js)",
  commandCategory: "Admin",
  usages: "delete <fileName.js>",
  cooldowns: 5,
  usePrefix: true,
  aliases: ["remove", "delcmd"]
};

module.exports.run = async function({ api, event, args, global }) {
  const fileName = args[0];

  if (!fileName || !fileName.endsWith(".js")) {
    return api.sendMessage(
      `❌ Usage: ${global.config.PREFIX}delete <fileName.js>\nExample: ${global.config.PREFIX}delete help.js`,
      event.threadID,
      event.messageID
    );
  }

  const commandPath = path.join(global.client.mainPath, "modules", "commands", fileName);

  try {
    // Check if file exists
    if (!fs.existsSync(commandPath)) {
      return api.sendMessage(`❌ File "${fileName}" does not exist.`, event.threadID, event.messageID);
    }

    // Attempt to remove command from memory
    const commandName = fileName.replace(".js", "");
    if (global.client.commands.has(commandName)) {
      global.client.commands.delete(commandName);
      delete require.cache[require.resolve(commandPath)];
    }

    // Delete file from disk
    await fs.remove(commandPath);

    return api.sendMessage(`✅ Command "${fileName}" has been deleted and unloaded.`, event.threadID, event.messageID);
  } catch (err) {
    console.error(`DELETE_CMD_ERR: ${err.message}`);
    return api.sendMessage(`❌ Failed to delete "${fileName}". Error: ${err.message}`, event.threadID, event.messageID);
  }
};
