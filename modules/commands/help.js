module.exports.config = {
  name: "help",
  commandCategory: "utility",
  usePrefix: true,
  version: "1.0.1",
  credits: "Hassan",
  description: "Lists all available commands or details for a specific one.",
  hasPermssion: 0,
  cooldowns: 5,
  aliases: ["h", "cmds", "commands"]
};

module.exports.run = async function({ api, event, args, global }) {
  const prefix = global.config.PREFIX;
  const commands = global.client.commands;

  let commandCount = 0;

  const enabledCommands = Array.from(commands.values()).filter(cmd => 
    !global.config.commandDisabled.includes(`${cmd.config.name}.js`)
  );

  if (enabledCommands.length === 0) {
    return api.sendMessage("No commands are currently available.", event.threadID, event.messageID);
  }

  // Show details for specific command
  if (args[0]) {
    const searchCommand = args[0].toLowerCase();
    const command = enabledCommands.find(cmd => 
      cmd.config.name.toLowerCase() === searchCommand || 
      (cmd.config.aliases && cmd.config.aliases.map(a => a.toLowerCase()).includes(searchCommand))
    );

    if (command) {
      const { name, commandCategory, description, cooldowns, usePrefix, aliases, credits } = command.config;
      let msg = `✨ Command: ${name}\n`;
      msg += `📚 Category: ${commandCategory}\n`;
      msg += `📝 Description: ${description}\n`;
      msg += `⏰ Cooldown: ${cooldowns || 0} seconds\n`;
      msg += `❗ Usage: ${usePrefix ? prefix : ""}${name} ${command.config.usage || ""}\n`;
      if (aliases && aliases.length > 0) {
        msg += `🔠 Aliases: ${aliases.join(", ")}\n`;
      }
      msg += `👤 Credits: ${credits || "Unknown"}\n`;
      return api.sendMessage(msg, event.threadID, event.messageID);
    } else {
      return api.sendMessage(`❌ Command '${searchCommand}' not found or is disabled.`, event.threadID, event.messageID);
    }
  }

  // Show general command list
  const categories = new Map();
  enabledCommands.forEach(cmd => {
    const category = cmd.config.commandCategory || "Other";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(cmd.config.name);
    commandCount++;
  });

  let message = `Here are my available commands (${commandCount}):\n\n`;
  categories.forEach((cmds, category) => {
    message += `📚 ${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
    message += `‣ ${cmds.join(", ")}\n\n`;
  });

  message += `ℹ️ Type: ${prefix}help [command name] to get details on a specific command.`;
  api.sendMessage(message, event.threadID, event.messageID);
};
