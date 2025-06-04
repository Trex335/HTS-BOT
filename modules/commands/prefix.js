module.exports.config = {
  name: "prefix",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hassan",
  description: "Displays the bot's system prefix and your chat's prefix.",
  commandCategory: "utility",
  usages: "prefix", // Updated usage for non-prefix
  cooldowns: 5,
  usePrefix: false // <--- CHANGE THIS LINE FROM 'true' TO 'false'
};

module.exports.run = async ({ api, event, args, global }) => {
  try {
    console.log("[DEBUG] Prefix command triggered.");

    const systemPrefix = global.config.PREFIX;
    const chatPrefix = global.config.PREFIX; // Still assuming same for now

    console.log(`[DEBUG] System Prefix: ${systemPrefix}`);
    console.log(`[DEBUG] Chat Prefix: ${chatPrefix}`);
    console.log(`[DEBUG] Thread ID: ${event.threadID}`);
    console.log(`[DEBUG] Message ID: ${event.messageID}`);

    const message = `🌐 System prefix: ${systemPrefix}\n🛸 Your box chat prefix: ${chatPrefix}`;

    api.sendMessage(message, event.threadID, event.messageID, (err) => {
      if (err) {
        console.error("[DEBUG] Error sending message:", err);
      } else {
        console.log("[DEBUG] Message sent successfully.");
      }
    });

  } catch (error) {
    console.error("[DEBUG] Unexpected error in prefix command:", error);
    api.sendMessage("An error occurred while trying to display the prefix. Please try again later.", event.threadID, event.messageID);
  }
};