const axios = require("axios");

module.exports.config = {
  name: "genimage",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hassan",
  description: "Generate an AI image from text (no API key needed)",
  commandCategory: "AI-Image",
  usages: "genimage <prompt>",
  cooldowns: 5,
  usePrefix: true,
  aliases: ["draw", "aiimage", "imagegen"]
};

module.exports.run = async function ({ api, event, args }) {
  const prompt = args.join(" ");

  if (!prompt) {
    return api.sendMessage("❌ Please provide a prompt.\nExample: genimage a futuristic city on Mars", event.threadID, event.messageID);
  }

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

  try {
    const res = await axios.get(imageUrl, { responseType: "stream" });

    const msg = {
      body: `🖼️ Here's your image for: "${prompt}"`,
      attachment: res.data
    };

    return api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    console.error("Image generation error:", err.message);
    return api.sendMessage("❌ Failed to generate image. Please try again later.", event.threadID, event.messageID);
  }
};
