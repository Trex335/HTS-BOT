const axios = require('axios');

const defaultEmojiTranslate = "🌐"; // Define outside module.exports to be accessible by mockLangFileContent

// Helper function for translation
async function translate(text, langCode) {
    try {
        const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`);
        return {
            text: res.data[0].map(item => item[0]).join(''),
            lang: res.data[2] // Source language detected
        };
    } catch (error) {
        console.error("Translation API error:", error.message);
        throw new Error("Could not translate text. Please try again later.");
    }
}

// Helper function to send translated message
async function translateAndSendMessage(content, langCodeTrans, message, getLang) {
    try {
        const { text, lang } = await translate(content.trim(), langCodeTrans.trim());
        return message.reply(`${text}\n\n${getLang("translate.translateTo", lang, langCodeTrans)}`);
    } catch (error) {
        return message.reply(`Translation failed: ${error.message}`);
    }
}

module.exports = {
    config: {
        name: "translate",
        aliases: ["trans"],
        version: "1.5",
        credits: "Hassan",
        countDown: 5,
        role: 0, // 0 for everyone, 1 for admin
        description: {
            vi: "Dịch văn bản sang ngôn ngữ mong muốn",
            en: "Translate text to the desired language"
        },
        category: "utility",
        guide: {
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
        eventType: ["message", "message_reaction"] // Added event types for onChat and onReaction
    },
    // No `langs` property here, language data is loaded globally by index.js

    // `onStart` corresponds to `run` in your index.js's command structure
    run: async function({ api, event, args, threadsData, getLang, commandName }) {
        // Handle -r / -react / -reaction arguments
        if (["-r", "-react", "-reaction"].includes(args[0])) {
            if (args[1] === "set") {
                return api.sendMessage(getLang("translate.inputEmoji"), event.threadID, event.messageID, (err, info) => {
                    if (err) return console.error("Error sending message for emoji set:", err);
                    // Store reaction handler in global.client.onReaction
                    global.client.onReaction.set(info.messageID, {
                        type: "setEmoji",
                        commandName,
                        messageID: info.messageID,
                        authorID: event.senderID
                    });
                });
            }
            const isEnable = args[1] === "on" ? true : args[1] === "off" ? false : null;
            if (isEnable === null) {
                return api.sendMessage(getLang("translate.invalidArgument"), event.threadID, event.messageID);
            }
            await threadsData.set(event.threadID, isEnable, "data.translate.autoTranslateWhenReaction");
            return api.sendMessage(isEnable ? getLang("translate.turnOnTransWhenReaction") : getLang("translate.turnOffTransWhenReaction"), event.threadID, event.messageID);
        }

        // Handle direct translation requests
        const { body = "" } = event;
        let content;
        let langCodeTrans;
        const langOfThread = await threadsData.get(event.threadID, "data.lang") || global.config.language; // Use global.config.language

        if (event.messageReply) {
            content = event.messageReply.body;
            let lastIndexSeparator = body.lastIndexOf("->");
            if (lastIndexSeparator === -1)
                lastIndexSeparator = body.lastIndexOf("=>");

            if (lastIndexSeparator !== -1 && (body.length - lastIndexSeparator === 4 || body.length - lastIndexSeparator === 5))
                langCodeTrans = body.slice(lastIndexSeparator + 2);
            else if ((args[0] || "").match(/\w{2,3}/))
                langCodeTrans = args[0].match(/\w{2,3}/)[0];
            else
                langCodeTrans = langOfThread;
        } else {
            content = event.body;
            let lastIndexSeparator = content.lastIndexOf("->");
            if (lastIndexSeparator === -1)
                lastIndexSeparator = content.lastIndexOf("=>");

            if (lastIndexSeparator !== -1 && (content.length - lastIndexSeparator === 4 || content.length - lastIndexSeparator === 5)) {
                langCodeTrans = content.slice(lastIndexSeparator + 2);
                content = content.slice(content.indexOf(args[0]), lastIndexSeparator);
            } else {
                // If no "->lang" specified and not a reply, try to translate the whole body
                // after the command name if it's prefixed
                if (content.startsWith(global.config.PREFIX + commandName)) {
                    content = content.slice(global.config.PREFIX.length + commandName.length).trim();
                } else {
                    // For non-prefix commands, the full body is the content
                    content = event.body;
                }
                langCodeTrans = langOfThread;
            }
        }

        if (!content || content.trim() === "") {
            // Replaced message.SyntaxError() with an actual message
            return api.sendMessage(getLang("translate.guide", global.config.PREFIX + commandName), event.threadID, messageID);
        }
        translateAndSendMessage(content, langCodeTrans, { reply: (msg) => api.sendMessage(msg, threadID, messageID) }, getLang);
    },

    // `onChat` is called for every message not caught by a command
    onChat: async ({ api, event, threadsData, getLang, commandName }) => {
        // This function is only executed if autoTranslateWhenReaction is enabled
        // and its config.eventType includes "message"
        const isAutoTranslateEnabled = await threadsData.get(event.threadID, "data.translate.autoTranslateWhenReaction");
        if (!isAutoTranslateEnabled) return;

        // Store message data for potential reaction translation
        global.client.onReaction.set(event.messageID, {
            commandName, // The command that registered this (e.g., 'translate')
            messageID: event.messageID,
            body: event.body,
            type: "translate"
        });
    },

    // `onReaction` is called when a reaction is detected on a message handled by the bot
    onReaction: async ({ api, event, Reaction, threadsData, getLang }) => {
        switch (Reaction.type) {
            case "setEmoji": {
                if (event.userID !== Reaction.authorID) // Only the person who initiated "set emoji" can set it
                    return;
                const emoji = event.reaction;
                if (!emoji) return;

                await threadsData.set(event.threadID, emoji, "data.translate.emojiTranslate");
                return api.sendMessage(getLang("translate.emojiSet", emoji), event.threadID, Reaction.messageID, () => api.unsendMessage(Reaction.messageID));
            }
            case "translate": {
                const emojiTrans = await threadsData.get(event.threadID, "data.translate.emojiTranslate") || defaultEmojiTranslate;
                if (event.reaction === emojiTrans) {
                    const langCodeTrans = await threadsData.get(event.threadID, "data.lang") || global.config.language; // Default to bot's language
                    const content = Reaction.body;
                    // Remove the reaction handler after processing
                    global.client.onReaction.delete(event.messageID);
                    translateAndSendMessage(content, langCodeTrans, { reply: (msg) => api.sendMessage(msg, event.threadID, event.messageID) }, getLang);
                }
            }
        }
    }
};
