const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

const Prefixes = ["ai", "Yau5", "Ai", "assistant", "bot"];

// Enhanced chat history management
global.chatHistory = {};

// Configuration for different AI services
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
    version: "2.5.0",
    author: "Hassan",
    role: 0, // Changed to 0 to allow all users
    category: "ai",
    shortDescription: {
      en: "Advanced AI assistant with multi-feature support",
    },
    longDescription: {
      en: `An intelligent AI assistant capable of text responses, image generation, and specialized waifu image fetching.`,
    },
    guide: {
      en: `{pn} [prompt]

Features:
1. Text Responses:
   - {pn} Explain quantum computing
   - {pn} Tell me a joke

2. Image Search:
   - {pn} image sunset
   - {pn} show me pictures of dogs -4 (gets 4 images)

3. Waifu Images:
   - {pn} waifu maid
   - {pn} waifu raiden-shogun -2 (gets 2 images)

4. Contextual Replies:
   - Reply to AI's message to continue conversation

Available waifu tags:
SFW: ${WAIFU_TAGS.sfw.join(", ")}
NSFW: ${WAIFU_TAGS.nsfw.join(", ")}`
    },
  },

  onStart: async function ({ message }) {
    await message.reply("âœ… AI Assistant is ready! Type 'ai help' for usage guide.");
  },

  onChat: async function ({ api, event, args, message }) {
    try {
      const prefix = Prefixes.find(p => 
        event.body && event.body.toLowerCase().startsWith(p.toLowerCase())
      );

      if (!prefix) return;

      let prompt = event.body.substring(prefix.length).trim();
      const senderID = event.senderID;

      // Initialize chat history if needed
      if (!global.chatHistory[senderID]) {
        global.chatHistory[senderID] = [];
      }

      // Handle contextual replies
      if (event.type === "message_reply" && global.chatHistory[senderID].length > 0) {
        const lastExchange = global.chatHistory[senderID].slice(-1)[0];
        prompt = `${lastExchange.prompt} [CONTEXT] ${prompt}`;
      }

      // Check for special commands
      if (prompt.toLowerCase() === "clear history") {
        global.chatHistory[senderID] = [];
        return message.reply("Your chat history has been cleared.");
      }

      if (prompt.toLowerCase() === "help") {
        return message.reply(this.config.guide.en.replace(/\{pn\}/g, prefix));
      }

      // Show typing indicator
      api.setMessageReaction("âŒ›", event.messageID, () => {}, true);

      // Handle image requests
      if (prompt.toLowerCase().includes("image") || prompt.toLowerCase().includes("picture")) {
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
      api.setMessageReaction("âœ…", event.messageID, () => {}, true);

    } catch (error) {
      console.error("AI Command Error:", error);
      await message.reply(`âœ– Error: ${error.message || "Failed to process request"}`);
      api.setMessageReaction("âœ–", event.messageID, () => {}, true);
    }
  },

  extractWaifuTag: function(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const waifuPrefix = "waifu";
    
    if (!lowerPrompt.includes(waifuPrefix)) return null;
    
    const tagPart = prompt.substring(prompt.toLowerCase().indexOf(waifuPrefix) + waifuPrefix.length).trim();
    const possibleTag = tagPart.split(/\s+/)[0].toLowerCase();
    
    if ([...WAIFU_TAGS.sfw, ...WAIFU_TAGS.nsfw].includes(possibleTag)) {
      return possibleTag;
    }
    
    return null;
  },

  async handleWaifuRequest({ api, event, tag, message }) {
    try {
      const isNsfw = WAIFU_TAGS.nsfw.includes(tag);
      const threadInfo = await api.getThreadInfo(event.threadID);
      
      if (isNsfw && !threadInfo.isGroup) {
        return message.reply("NSFW content is only allowed in groups.");
      }

      const response = await axios.get(`${AI_SERVICES.WAIFU_API}?included_tags=${tag}&many=true`);
      const images = response.data.images.slice(0, 4); // Limit to 4 images
      
      const attachments = await Promise.all(
        images.map(async (img, i) => {
          const imgPath = path.join(__dirname, "cache", `waifu_${i}.jpg`);
          const imgResponse = await axios.get(img.url, { responseType: "arraybuffer" });
          await fs.outputFile(imgPath, imgResponse.data);
          return fs.createReadStream(imgPath);
        })
      );

      await message.reply({
        body: `ðŸ§± Here are your ${tag} waifu images:`,
        attachment: attachments
      });

      await fs.remove(path.join(__dirname, "cache"));
    } catch (error) {
      throw new Error(`Failed to fetch waifu images: ${error.message}`);
    }
  },

  async handleImageRequest({ api, event, prompt, message }) {
    try {
      const cleanPrompt = prompt.replace(/image|picture|show me|photos?/gi, "").trim();
      const numberMatch = cleanPrompt.match(/-(\d+)$/);
      const numImages = numberMatch ? Math.min(parseInt(numberMatch[1], 10), 8) : 4;
      const searchQuery = cleanPrompt.replace(/-\d+$/, "").trim();

      const response = await axios.get(`${AI_SERVICES.IMAGE_API}?query=${encodeURIComponent(searchQuery)}&per_page=${numImages}`, {
        headers: { Authorization: "NoL8ytYlwsYIqmkLBboshW909HzoBoBnGZJbpmwAcahp5PF9TAnr9p7Z" } // Replace with actual key
      });

      const images = response.data.photos.slice(0, numImages);
      
      if (images.length === 0) {
        return message.reply("No images found for your query.");
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
        body: `ðŸ“· Here are ${images.length} images for "${searchQuery}":`,
        attachment: attachments
      });

      await fs.remove(path.join(__dirname, "cache"));
    } catch (error) {
      throw new Error(`Image search failed: ${error.message}`);
    }
  },

  async getAIResponse(prompt) {
    try {
      // Try primary API first
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
      throw new Error("All AI services are currently unavailable. Please try again later.");
    }
  },

  onReply: async function ({ api, message, event, args }) {
    return this.onChat({ api, message, event, args });
  }
};
