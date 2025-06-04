module.exports.config = {
  name: "help",
  commandCategory: "utility",
  usePrefix: true, // Set to true if you want users to use the prefix for this command
  version: "1.0.0",
  credits: "Hassan", // Change this to your name or the bot's developer
  description: "Lists all available commands.",
  hasPermssion: 0, // 0: All users, 1: Admin only
  cooldowns: 5, // Cooldown in seconds before a user can use this command again
  aliases: ["h", "cmds", "commands"] // Optional: add aliases for the command
};

module.exports.run = async function({ api, event, args, global }) {
  const prefix = global.config.PREFIX;
  const commands = global.client.commands; // Access the commands Map from global.client

  let commandList = "";
  let commandCount = 0;

  // Filter out commands that are disabled
  const enabledCommands = Array.from(commands.values()).filter(cmd => 
    !global.config.commandDisabled.includes(`${cmd.config.name}.js`)
  );

  if (enabledCommands.length === 0) {
    return api.sendMessage("No commands are currently available.", event.threadID, event.messageID);
  }

  // If a specific command is requested (e.g., "?help hello")
  if (args[0]) {
    const searchCommand = args[0].toLowerCase();
    const command = enabledCommands.find(cmd => 
      cmd.config.name.toLowerCase() === searchCommand || 
      (cmd.config.aliases && cmd.config.aliases.map(a => a.toLowerCase()).includes(searchCommand))
    );

    if (command) {
      const { name, commandCategory, description, cooldowns, usePrefix, aliases } = command.config;
      let msg = `✨ Command: ${name}\n`;
      msg += `📚 Category: ${commandCategory}\n`;
      msg += `📝 Description: ${description}\n`;
      msg += `⏰ Cooldown: ${cooldowns || 0} seconds\n`;
      msg += `❗ Usage: ${usePrefix ? prefix : ""}${name} ${command.config.usage || ""}\n`;
      if (aliases && aliases.length > 0) {
        msg += `🔠 Aliases: ${aliases.join(", ")}\n`;
      }
      return api.sendMessage(msg, event.threadID, event.messageID);
    } else {
      return api.sendMessage(`Command '${searchCommand}' not found or is disabled.`, event.threadID, event.messageID);
    }
  }

  // If no specific command is requested, list all commands by category
  const categories = new Map();
  enabledCommands.forEach(cmd => {
    const category = cmd.config.commandCategory || "No Category";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(cmd.config.name);
    commandCount++;
  });

  let message = `Here are my available commands (${commandCount}):\n\n`;
  categories.forEach((cmds, category) => {
    message += `📚 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands:\n`;
    message += `‣ ${cmds.join(", ")}\n\n`;
  });

  message += `To get more info on a command, type: ${prefix}help [command name]`;
  api.sendMessage(message, event.threadID, event.messageID);
};
