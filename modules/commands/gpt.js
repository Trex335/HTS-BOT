const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hassan",
  description: "Chat with an AI model using GPT-3 (no API key)",
  commandCategory: "AI-Text",
  usages: "gpt <your prompt>",
  cooldowns: 3,
  usePrefix: true,
  aliases: ["reen", "ask", "aichat"]
};

module.exports.run = async function ({ api, event, args }) {
  const prompt = args.join(" ");
  if (!prompt) {
    return api.sendMessage("❌ Please enter a prompt.\n\nExample: gpt Who was the first person on the moon?", event.threadID, event.messageID);
  }

  api.sendMessage("🤖 Thinking...", event.threadID, event.messageID);

  try {
    const res = await axios.get(`https://hassan-gpt3-api.onrender.com/gpt3?prompt=${encodeURIComponent(prompt)}`);

    if (res.data && res.data.text) {
      return api.sendMessage(`💬 GPT:\n\n${res.data.text}`, event.threadID, event.messageID);
    } else {
      return api.sendMessage("⚠️ I didn't get a valid response from the AI.", event.threadID, event.messageID);
    }
  } catch (err) {
    console.error("GPT Error:", err.message);
    return api.sendMessage("❌ Error talking to the AI. Try again later.", event.threadID, event.messageID);
  }
};
