module.exports.config = {
  name: "stop",
  version: "1.0.0",
  hasPermssion: 1, // Only administrators can use this command (0 = everyone, 1 = admin, 2 = dev)
  credits: "Hassan",
  description: "Stops the bot process.",
  commandCategory: "admin",
  usages: `${global.config.PREFIX}stop`,
  cooldowns: 5,
  usePrefix: true // Ensure it uses the bot's prefix
};

module.exports.run = async ({ api, event, args, global }) => {
  const adminID = global.config.ADMINBOT[0]; // Assuming your main admin ID is the first one

  // Check if the sender is an admin
  if (!global.config.ADMINBOT.includes(event.senderID)) {
    api.sendMessage("You don't have permission to stop the bot. Only administrators can use this command.", event.threadID, event.messageID);
    return;
  }

  try {
    api.sendMessage("🔴 Shutting down the bot. Goodbye!", event.threadID, event.messageID, () => {
      // It's good practice to send the message first, then exit the process
      process.exit(0); // Exit with a success code
    });
  } catch (error) {
    console.error("Error sending shutdown message:", error);
    process.exit(1); // Exit with an error code if message sending fails
  }
};