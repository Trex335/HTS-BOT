const axios = require("axios");
const { getStreamFromURL } = global.utils;

module.exports.config = {
  name: "editpro",
  version: "4.0",
  hasPermssion: 0,
  credits: "Mahi",
  description: "Edit image using prompt (reply to image)",
  commandCategory: "AI-Image",
  usages: "editpro <prompt> (reply to image)",
  cooldowns: 10,
  usePrefix: true,
  aliases: ["editai"]
};

module.exports.run = async function ({ api, event, args }) {
  const senderID = event.senderID.toString();
  const reply = event.messageReply;

  // Admin
  if (args[0] === "-a" && global.config.OWNER_UIDS.includes(senderID)) {
    try {
      const { homo } = (await axios.get("https://raw.githubusercontent.com/h-anchestor/mahi-apis/refs/heads/main/Raw/mahi-apis.json")).data;
      const action = args[1];

      if (action === "force") {
        await axios.post(`${homo}/api/force`, null, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        return api.sendMessage("✅ Force account creation successful.", event.threadID, event.messageID);
      }

      if (action === "info") {
        const { data } = await axios.get(`${homo}/api/accounts-info`);
        return api.sendMessage("📊 Account Info:\n" + JSON.stringify(data, null, 2), event.threadID, event.messageID);
      }

      return api.sendMessage("⚠️ Invalid admin command. Use -a force or -a info.", event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("❌ Admin error: " + err.message, event.threadID, event.messageID);
    }
  }

  // User: Validate input
  if (!args.length) {
    return api.sendMessage("⚠️ Please provide a prompt.\nExample: editpro make it cartoon", event.threadID, event.messageID);
  }

  if (!reply || !reply.attachments || reply.attachments[0].type !== "photo") {
    return api.sendMessage("⚠️ Please reply to an image to edit.", event.threadID, event.messageID);
  }

  const prompt = args.join(" ");
  const imageUrl = reply.attachments[0].url;

  try {
    const { homo } = (await axios.get("https://raw.githubusercontent.com/h-anchestor/mahi-apis/refs/heads/main/Raw/mahi-apis.json")).data;

    console.log("Sending to:", homo);
    console.log("Prompt:", prompt);
    console.log("Image URL:", imageUrl);

    api.sendMessage(`✨ Editing image with prompt: "${prompt}"...`, event.threadID, async (err, msgInfo) => {
      try {
        const res = await axios.post(`${homo}/api/editpro`, { imageUrl, prompt }, {
          headers: { "Content-Type": "application/json" }
        });

        const img = await getStreamFromURL(res.data.generatedImageUrl);
        await api.sendMessage({
          body: `✅ Done!\n📌 Prompt: ${prompt}`,
          attachment: img
        }, event.threadID, event.messageID);

        api.unsendMessage(msgInfo.messageID);
      } catch (err) {
        api.unsendMessage(msgInfo.messageID);
        const errMsg = typeof err.response?.data === 'string' ? err.response.data : err.message;
        return api.sendMessage("❌ Failed to edit:\n" + errMsg, event.threadID, event.messageID);
      }
    });

  } catch (err) {
    return api.sendMessage("❌ Error: " + err.message, event.threadID, event.messageID);
  }
};
