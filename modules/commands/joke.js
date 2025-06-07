const axios = require("axios");

module.exports.config = {
  name: "joke",
  commandCategory: "fun",
  usePrefix: true,
  version: "1.0.0",
  credits: "Hassan",
  description: "Get a random joke.",
  hasPermssion: 0,
  cooldowns: 5,
  aliases: ["funny", "lol"]
};

module.exports.run = async function({ api, event }) {
  try {
    const res = await axios.get("https://official-joke-api.appspot.com/random_joke");
    const joke = res.data;
    const msg = `😂 Here's a joke for you:\n\n${joke.setup}\n\n${joke.punchline}`;
    return api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    console.error("Joke command error:", err.message);
    return api.sendMessage("❌ Couldn't fetch a joke right now. Try again later.", event.threadID, event.messageID);
  }
};
