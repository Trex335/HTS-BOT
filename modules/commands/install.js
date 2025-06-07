const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: 'install',
    version: '1.0.3',
    hasPermssion: 0,
    credits: 'Hassan',
    description: 'Installs a new command from a raw URL (Pastebin/Gist).',
    commandCategory: 'Admin',
    usages: '-install <fileName.js> <rawURL>',
    cooldowns: 5,
    usePrefix: true
  },

  run: async function ({ api, event, args, global, prompt }) {
    const senderId = event.senderID;
    const threadID = event.threadID;

    if (!global.config.ADMINBOT.includes(senderId)) {
      return api.sendMessage("You don't have permission to use this command.", threadID, event.messageID);
    }

    if (args.length !== 2) {
      return api.sendMessage(`Usage: ${global.config.PREFIX}install <fileName.js> <rawURL>\nExample: ${global.config.PREFIX}install mycmd.js https://pastebin.com/raw/abc123`, threadID, event.messageID);
    }

    const fileName = args[0];
    const sourceUrl = args[1];

    if (!fileName.endsWith('.js')) {
      return api.sendMessage(`Error: File name must end with '.js' (e.g., 'mycommand.js').`, threadID, event.messageID);
    }

    if (!sourceUrl.startsWith('https://pastebin.com/raw/') && !sourceUrl.startsWith('https://gist.githubusercontent.com/')) {
      return api.sendMessage(`Error: Invalid URL. Only raw Pastebin or GitHub Gist links are allowed.`, threadID, event.messageID);
    }

    try {
      api.sendMessage(`📦 Installing "${fileName}"...`, threadID, event.messageID);

      const response = await axios.get(sourceUrl, { responseType: 'text' });
      const commandCode = response.data;

      api.sendMessage("⚠️ Reminder: Only install code from trusted sources!", threadID);

      const commandFilePath = path.join(__dirname, fileName);
      fs.writeFileSync(commandFilePath, commandCode, 'utf8');

      const success = await global.client.loadCommand(fileName);

      if (success) {
        const commandName = fileName.replace(/\.js$/, '');
        api.sendMessage(`✅ Command '${commandName}' installed and loaded successfully!`, threadID, event.messageID);
      } else {
        api.sendMessage(`⚠️ Command '${fileName}' was saved but failed to load. Check the console for issues.`, threadID, event.messageID);
      }

    } catch (error) {
      let msg = `❌ Failed to install '${fileName}': ${error.message}`;
      if (error.response) {
        msg += `\nStatus: ${error.response.status}`;
      } else if (error.code) {
        msg += `\nError Code: ${error.code}`;
      }
      api.sendMessage(msg, threadID, event.messageID);
    }
  }
};
