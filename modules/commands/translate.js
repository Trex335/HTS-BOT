const axios = require("axios");

module.exports.config = {
  name: "translate",
  aliases: ["trans"],
  version: "1.0",
  credits: "NTKhang (mode Hassan)",
  description: "Translate text to the desired language",
  commandCategory: "utility",
  usages: "translate <text> -> <language_code>\ntranslate (reply to message)",
  cooldowns: 5,
  usePrefix: true,
  hasPermssion: 0
};

module.exports.languages = {
  en: {
    usage: "⚠️ Please provide text to translate.\nExample: translate hello -> vi",
    error: "❌ An error occurred: %1",
    translated: "🌐 Translated (%1 → %2):\n%3",
    noReply: "⚠️ Please provide text or reply to a message to translate."
  }
};

module.exports.run = async function ({ api, event, args, getLang }) {
  const threadLang = global.GoatBot?.config?.language || "en";
  let text, targetLang = threadLang;

  try {
    if (event.messageReply) {
      text = event.messageReply.body;
    } else {
      const body = args.join(" ");
      if (!body) return api.sendMessage(getLang("usage"), event.threadID, event.messageID);

      const sep = body.lastIndexOf("->") !== -1 ? body.lastIndexOf("->") : body.lastIndexOf("=>");
      if (sep !== -1 && body.length - sep <= 5) {
        text = body.slice(0, sep).trim();
        targetLang = body.slice(sep + 2).trim();
      } else {
        text = body;
      }
    }

    if (!text) return api.sendMessage(getLang("noReply"), event.threadID, event.messageID);

    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const translatedText = res.data[0].map(item => item[0]).join('');
    const sourceLang = res.data[2] || "auto";

    return api.sendMessage(getLang("translated", sourceLang, targetLang, translatedText), event.threadID, event.messageID);
  } catch (err) {
    return api.sendMessage(getLang("error", err.message), event.threadID, event.messageID);
  }
};
