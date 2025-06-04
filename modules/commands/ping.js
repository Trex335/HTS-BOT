
          module.exports.config = {
            name: "ping",
            commandCategory: "utility",
            usePrefix: true,
            version: "1.0.0",
            credits: "Your Name",
            description: "Responds with pong!",
            hasPermssion: 0,
            cooldowns: 5
          };
          module.exports.run = async ({ api, event, args, global }) => {
            api.sendMessage(global.getText("commands", "ping"), event.threadID, event.messageID);
          };
        