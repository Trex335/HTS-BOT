const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

// Chat history management
global.chatHistory = {};

// AI Services Configuration
const AI_SERVICES = {
  MAIN: "https://over-ai-yau-5001-center-hassan.vercel.app/ai",
  BACKUP: "https://api.other-ai-service.com/v1/chat",
  IMAGE_API: "https://api.pexels.com/v1/search",
  WAIFU_API: "https://api.waifu.im/search"
};

// Valid waifu tags
const WAIFU_TAGS = {
  sfw: ["maid", "waifu", "marin-kitagawa", "mori-calliope", "raiden-shogun", "oppai", "selfies", "uniform", "kamisato-ayaka"],
  nsfw: ["ass", "hentai", "milf", "oral", "paizuri", "ecchi", "ero"]
};

module.exports = {
  config: {
    name: "ai",
    version: "2.6.0",
    author: "Hassan",
    role: 0,
    category: "ai",
    usePrefix: false, // Disables prefix requirement
    shortDescription: {
      en: "Advanced AI assistant with natural language support",
    },
    longDescription: {
      en: `An intelligent AI assistant that understands natural language requests for text, images, and waifu pictures without requiring prefixes.`,
    },
    guide: {
      en: `Simply message naturally or use these starter words: ai, Yau5, Ai, assistant, bot

Examples:
1. Regular chat:
   - "Tell me about quantum computing"
   - "What's the weather today?"

2. Image search:
   - "Show me sunset pictures"
   - "image dogs -4" (gets 4 images)

3. Waifu images:
   - "waifu maid"
   - "send me raiden-shogun pics -2" (gets 2 images)

Available waifu tags:
SFW: ${WAIFU_TAGS.sfw.join(", ")}
NSFW: ${WAIFU_TAGS.nsfw.join(", ")}`
    },
  },

  onStart: async function ({ message }) {
    await message.reply("🤖 AI Assistant ready! Message naturally or use 'help' for guidance.");
  },

  onChat: async function ({ api, event, args, message }) {
    try {
      // Skip if it's a command from another module
      if (event.body.startsWith(global.config.PREFIX)) return;
      
      const prompt = event.body.trim();
      const senderID = event.senderID;

      // Initialize chat history
      if (!global.chatHistory[senderID]) {
        global.chatHistory[senderID] = [];
      }

      // Handle special commands
      if (prompt.toLowerCase() === "clear history") {
        global.chatHistory[senderID] = [];
        return message.reply("🗑️ Chat history cleared!");
      }

      if (prompt.toLowerCase() === "help") {
        return message.reply(this.config.guide.en);
      }

      // Show typing indicator
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Handle image requests
      if (prompt.toLowerCase().includes("image") || 
          prompt.toLowerCase().includes("picture") ||
          prompt.toLowerCase().includes("show me") ||
          prompt.toLowerCase().includes("send me")) {
        return this.handleImageRequest({ api, event, prompt, message });
      }

      // Handle waifu requests
      const waifuTag = this.extractWaifuTag(prompt);
      if (waifuTag) {
        return this.handleWaifuRequest({ api, event, tag: waifuTag, message });
      }

      // Default AI response
      const aiResponse = await this.getAIResponse(prompt);
      
      // Store conversation context
      global.chatHistory[senderID].push({
        prompt,
        response: aiResponse
      });

      // Trim history to prevent memory issues
      if (global.chatHistory[senderID].length > 10) {
        global.chatHistory[senderID].shift();
      }

      await message.reply(aiResponse);
      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (error) {
      console.error("AI Command Error:", error);
      await message.reply(`❌ Error: ${error.message || "Request failed"}`);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  },

  extractWaifuTag: function(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const waifuPrefixes = ["waifu", "send me", "show me", "pic of"];
    
    const hasWaifuPrefix = waifuPrefixes.some(prefix => lowerPrompt.includes(prefix));
    if (!hasWaifuPrefix) return null;
    
    for (const tag of [...WAIFU_TAGS.sfw, ...WAIFU_TAGS.nsfw]) {
      if (lowerPrompt.includes(tag)) return tag;
    }
    
    return null;
  },

  async handleWaifuRequest({ api, event, tag, message }) {
    try {
      const isNsfw = WAIFU_TAGS.nsfw.includes(tag);
      
      // Get number of images requested (-2, -4 etc.)
      const numMatch = event.body.match(/-(\d+)$/);
      const numImages = numMatch ? Math.min(parseInt(numMatch[1], 10), 8) : 4;

      if (isNsfw) {
        const threadInfo = await api.getThreadInfo(event.threadID);
        if (!threadInfo.isGroup) {
          return message.reply("🔞 NSFW content is only allowed in groups.");
        }
      }

      const response = await axios.get(`${AI_SERVICES.WAIFU_API}?included_tags=${tag}&many=true`);
      const images = response.data.images.slice(0, numImages);
      
      const attachments = await Promise.all(
        images.map(async (img, i) => {
          const imgPath = path.join(__dirname, "cache", `waifu_${i}.jpg`);
          const imgResponse = await axios.get(img.url, { responseType: "arraybuffer" });
          await fs.outputFile(imgPath, imgResponse.data);
          return fs.createReadStream(imgPath);
        })
      );

      await message.reply({
        body: `🌸 Here are your ${tag} waifu images:`,
        attachment: attachments
      });

      await fs.remove(path.join(__dirname, "cache"));
    } catch (error) {
      throw new Error(`Failed to fetch waifu images: ${error.message}`);
    }
  },

  async handleImageRequest({ api, event, prompt, message }) {
    try {
      const cleanPrompt = prompt.replace(/(image|picture|show me|send me|photos?)/gi, "").trim();
      const numberMatch = cleanPrompt.match(/-(\d+)$/);
      const numImages = numberMatch ? Math.min(parseInt(numberMatch[1], 10), 8) : 4;
      const searchQuery = cleanPrompt.replace(/-\d+$/, "").trim();

      const response = await axios.get(`${AI_SERVICES.IMAGE_API}?query=${encodeURIComponent(searchQuery)}&per_page=${numImages}`, {
        headers: { Authorization: "NoL8ytYlwsYIqmkLBboshW909HzoBoBnGZJbpmwAcahp5PF9TAnr9p7Z" }
      });

      const images = response.data.photos.slice(0, numImages);
      
      if (images.length === 0) {
        return message.reply("🖼️ No images found for your query.");
      }

      const attachments = await Promise.all(
        images.map(async (photo, i) => {
          const imgPath = path.join(__dirname, "cache", `img_${i}.jpg`);
          const imgResponse = await axios.get(photo.src.medium, { responseType: "arraybuffer" });
          await fs.outputFile(imgPath, imgResponse.data);
          return fs.createReadStream(imgPath);
        })
      );

      await message.reply({
        body: `🖼️ Here are ${images.length} images for "${searchQuery}":`,
        attachment: attachments
      });

      await fs.remove(path.join(__dirname, "cache"));
    } catch (error) {
      throw new Error(`Image search failed: ${error.message}`);
    }
  },

  async getAIResponse(prompt) {
    try {
      const response = await axios.get(`${AI_SERVICES.MAIN}?prompt=${encodeURIComponent(prompt)}`);
      
      if (response.data && response.data.response) {
        return response.data.response;
      }

      // Fallback to backup API
      const backupResponse = await axios.post(AI_SERVICES.BACKUP, {
        prompt,
        context: "You are a helpful AI assistant"
      });

      return backupResponse.data.choices[0].message.content;
    } catch (error) {
      console.error("AI Service Error:", error);
      throw new Error("I'm having trouble thinking right now. Please try again later.");
    }
  },

  // Fallback compatibility
  run: async function () {},

  onReply: async function ({ api, message, event, args }) {
    return this.onChat({ api, message, event, args });
  }
};
