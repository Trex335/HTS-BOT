const axios = require('axios');

// Define defaultEmojiTranslate early so it's accessible within this module
const defaultEmojiTranslate = "🌐";

// Helper function for translation
async function translate(text, langCode) {
    try {
        // Use template literals for the URL for cleaner concatenation
        const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`);
        
        // The Google Translate API response structure:
        // res.data[0] is an array of arrays, where each inner array contains [translated_text, original_text]
        // res.data[2] is the detected source language code
        return {
            text: res.data[0].map(item => item[0]).join(''), // Join all translated segments
            lang: res.data[2] // Source language detected
        };
    } catch (error) {
        console.error("Translation API error:", error.message);
        // Throw a more user-friendly error message
        throw new Error("Could not translate text. The translation service might be unavailable or you provided invalid input.");
    }
}

// Helper function to send translated message back to the chat
async function translateAndSendMessage(content, langCodeTrans, message, getLang) {
    try {
        const { text, lang } = await translate(content.trim(), langCodeTrans.trim());
        // Use message.reply to send the translated text
        return message.reply(`${text}\n\n${getLang("translate.translateTo", lang, langCodeTrans)}`);
    } catch (error) {
        // Handle errors during translation and send a message to the user
        return message.reply(`Translation failed: ${error.message}`);
    }
}

// Main command module export
module.exports = {
    config: {
        name: "translate", // The command name (e.g., used as `?translate`)
        aliases: ["trans"], // Alternative names for the command
        version: "1.5",
        author: "NTKhang",
        countDown: 5, // Cooldown in seconds before the command can be used again
        role: 0, // Permission level: 0 for everyone, 1 for admin
        description: {
            vi: "Dịch văn bản sang ngôn ngữ mong muốn",
            en: "Translate text to the desired language"
        },
        category: "utility", // Category for help command organization
        guide: { // Usage guide for the command
            vi: "   {pn} <văn bản>: Dịch văn bản sang ngôn ngữ của box chat bạn hoặc ngôn ngữ mặc định của bot"
                + "\n   {pn} <văn bản> -> <ISO 639-1>: Dịch văn bản sang ngôn ngữ mong muốn"
                + "\n   hoặc có thể phản hồi 1 tin nhắn để dịch nội dung của tin nhắn đó"
                + "\n   Ví dụ:"
                + "\n    {pn} hello -> vi"
                + "\n   {pn} -r [on | off]: Bật hoặc tắt chế độ tự động dịch tin nhắn khi có người thả cảm xúc vào tin nhắn"
                + "\n   {pn} -r set : Đặt emoji để dịch tin nhắn trong nhóm chat của bạn",
            en: "   {pn} : Translate text to the language of your chat box or the default language of the bot"
                + "\n   {pn}  -> <ISO 639-1>: Translate text to the desired language"
                + "\n   or you can reply a message to translate the content of that message"
                + "\n   Example:"
                + "\n    {pn} hello -> vi"
                + "\n   {pn} -r [on | off]: Turn on or off the automatic translation mode when someone reacts to the message"
                + "\n   {pn} -r set : Set the emoji to translate the message in your chat group"
        },
        // Event types this module listens to. Crucial for onChat and onReaction.
        eventType: ["message", "message_reaction"] 
    },

    // `run` function is the main execution handler when the command is called with a prefix
    run: async function({ api, event, args, threadsData, getLang, commandName }) {
        const { threadID, messageID } = event; // Destructure common event properties for convenience

        // Handle sub-commands for reaction-based translation settings (-r, -react, -reaction)
        if (["-r", "-react", "-reaction"].includes(args[0])) {
            if (args[1] === "set") {
                // When user wants to set a custom emoji for reaction translation
                return api.sendMessage(getLang("translate.inputEmoji"), threadID, messageID, (err, info) => {
                    if (err) return console.error("Error sending message for emoji set:", err);
                    // Store the message ID and other relevant data in global.client.onReaction map
                    // This allows the onReaction hook to know what to do when a reaction occurs on this message
                    global.client.onReaction.set(info.messageID, {
                        type: "setEmoji", // Type of reaction handler
                        commandName, // The name of this command module
                        messageID: info.messageID, // The message ID to listen for reactions on
                        authorID: event.senderID // The user who initiated the "set emoji" action
                    });
                });
            }
            // Handle "on" or "off" arguments for auto-translate when reaction
            const isEnable = args[1] === "on" ? true : args[1] === "off" ? false : null;
            if (isEnable === null) {
                return api.sendMessage(getLang("translate.invalidArgument"), threadID, messageID);
            }
            // Save the setting to threadsData (your in-memory thread-specific storage)
            await threadsData.set(threadID, isEnable, "data.translate.autoTranslateWhenReaction");
            return api.sendMessage(isEnable ? getLang("translate.turnOnTransWhenReaction") : getLang("translate.turnOffTransWhenReaction"), threadID, messageID);
        }

        // Handle direct translation requests (without -r sub-commands)
        const { body = "" } = event;
        let content; // Text content to be translated
        let langCodeTrans; // Target language code for translation
        // Get the thread's language preference or fall back to global bot language
        const langOfThread = await threadsData.get(threadID, "data.lang") || global.config.language; 

        if (event.messageReply) {
            // If the command is a reply to another message
            content = event.messageReply.body; // Translate the replied message's body
            let lastIndexSeparator = body.lastIndexOf("->"); // Look for "->lang" in the current command's body
            if (lastIndexSeparator === -1)
                lastIndexSeparator = body.lastIndexOf("=>");

            if (lastIndexSeparator !== -1 && (body.length - lastIndexSeparator === 4 || body.length - lastIndexSeparator === 5)) {
                // Extract language code if found (e.g., "->en" or "->vie")
                langCodeTrans = body.slice(lastIndexSeparator + 2);
            } else if ((args[0] || "").match(/\w{2,3}/)) {
                // If no "->lang" but the first argument looks like a language code
                langCodeTrans = args[0].match(/\w{2,3}/)[0];
            } else {
                // Default to thread's language or bot's default language
                langCodeTrans = langOfThread;
            }
        } else {
            // If the command is not a reply (direct command)
            content = event.body;
            let lastIndexSeparator = content.lastIndexOf("->");
            if (lastIndexSeparator === -1)
                lastIndexSeparator = content.lastIndexOf("=>");

            if (lastIndexSeparator !== -1 && (content.length - lastIndexSeparator === 4 || content.length - lastIndexSeparator === 5)) {
                // Extract language code and content if "text ->lang" format
                langCodeTrans = content.slice(lastIndexSeparator + 2);
                content = content.slice(content.indexOf(args[0]), lastIndexSeparator);
            } else {
                // If no "->lang" specified, translate the entire message body after the command name
                if (content.startsWith(global.config.PREFIX + commandName)) {
                    content = content.slice(global.config.PREFIX.length + commandName.length).trim();
                } else {
                    // This path is for non-prefix commands where the entire body is the prompt
                    content = event.body;
                }
                langCodeTrans = langOfThread;
            }
        }

        // If no content is found, send guide message
        if (!content || content.trim() === "") {
            return api.sendMessage(getLang("translate.guide", global.config.PREFIX + commandName), threadID, messageID);
        }
        
        // Call the helper function to perform translation and send the result
        translateAndSendMessage(content, langCodeTrans, { reply: (msg) => api.sendMessage(msg, threadID, messageID) }, getLang);
    },

    // `onChat` function: executed for every message that IS NOT a command
    // This is used to set up the reaction listener for auto-translation
    onChat: async ({ api, event, threadsData, getLang, commandName }) => {
        // Check if auto-translate on reaction is enabled for this thread
        const isAutoTranslateEnabled = await threadsData.get(event.threadID, "data.translate.autoTranslateWhenReaction");
        if (!isAutoTranslateEnabled) return; // If disabled, do nothing

        // Store message data in global.client.onReaction map
        // This makes the message available for translation if someone reacts to it later
        global.client.onReaction.set(event.messageID, {
            commandName, // The command that registered this (e.g., 'translate')
            messageID: event.messageID,
            body: event.body, // Store the original message body
            type: "translate" // Type of reaction handler
        });
    },

    // `onReaction` function: executed when a reaction is added to a message that was
    // previously registered in global.client.onReaction
    onReaction: async ({ api, event, Reaction, threadsData, getLang }) => {
        switch (Reaction.type) {
            case "setEmoji": {
                // This case handles setting the custom emoji for reaction translation
                if (event.userID !== Reaction.authorID) // Only the person who initiated "set emoji" can confirm it
                    return;
                const emoji = event.reaction; // The emoji that was reacted with
                if (!emoji) return; // If no emoji, do nothing

                // Save the chosen emoji to threadsData for this thread
                await threadsData.set(event.threadID, emoji, "data.translate.emojiTranslate");
                // Send confirmation message and unsend the original bot message
                return api.sendMessage(getLang("translate.emojiSet", emoji), event.threadID, Reaction.messageID, () => api.unsendMessage(Reaction.messageID));
            }
            case "translate": {
                // This case handles actual translation when a reaction occurs
                // Get the emoji configured for translation in this thread, or use the default
                const emojiTrans = await threadsData.get(event.threadID, "data.translate.emojiTranslate") || defaultEmojiTranslate;
                
                // Check if the reaction matches the configured translation emoji
                if (event.reaction === emojiTrans) {
                    // Get the target language (thread's language or bot's default)
                    const langCodeTrans = await threadsData.get(event.threadID, "data.lang") || global.config.language;
                    const content = Reaction.body; // The original message content from the stored Reaction data

                    // Delete the reaction handler from memory once processed to prevent re-translation
                    global.client.onReaction.delete(event.messageID);
                    
                    // Perform translation and send the result
                    translateAndSendMessage(content, langCodeTrans, { reply: (msg) => api.sendMessage(msg, event.threadID, event.messageID) }, getLang);
                }
            }
        }
    }
};
