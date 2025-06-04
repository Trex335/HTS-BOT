const axios = require("axios");

module.exports.config = {
  name: "catfact",
  commandCategory: "fun",
  usePrefix: true,
  version: "1.0.0",
  credits: "Hassan",
  description: "Get a random cat fact.",
  hasPermssion: 0,
  cooldowns: 5,
  aliases: ["cat", "catfacts"]
};

module.exports.run = async function({ api, event }) {
  try {
    const response = await axios.get("https://catfact.ninja/fact");
    const fact = response.data.fact;
    return api.sendMessage(`🐱 Cat Fact:\n${fact}`, event.threadID, event.messageID);
  } catch (error) {
    console.error("Error fetching cat fact:", error.message);
    return api.sendMessage("❌ Could not fetch a cat fact at the moment. Please try again later.", event.threadID, event.messageID);
  }
};
