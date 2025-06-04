module.exports.config = {
  name: "prefix",
  commandCategory: "utility",
  usePrefix: true,
  version: "1.0.0",
  credits: "Hassan",
  description: "Shows the current prefix",
  hasPermssion: 0,
  cooldowns: 5
};

module.exports.run = async ({ api, event, args, global }) => {
  // If only the prefix is typed (no command after it)
  if (args.length === 0) {
    const prefixInfo = `🌐 System prefix: ${global.config.PREFIX}\n` +
                      `🛸 Your box chat prefix: ${global.config.PREFIX}`;
    
    return api.sendMessage(prefixInfo, event.threadID, event.messageID);
  }
  
  // If someone types "prefix" command (optional functionality)
  if (args[0].toLowerCase() === "prefix") {
    return api.sendMessage(
      `The current prefix is: ${global.config.PREFIX}`,
      event.threadID,
      event.messageID
    );
  }
};
