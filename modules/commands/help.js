
          module.exports.config = {
            name: "help",
            commandCategory: "utility",
            usePrefix: true,
            version: "1.0.0",
            credits: "Your Name",
            description: "Shows all available commands.",
            hasPermssion: 0,
            cooldowns: 5
          };
          module.exports.run = async ({ api, event, args, global }) => {
            let allCommands = [];
            global.client.commands.forEach(command => {
                // Ensure command has a config and a name, and uses the prefix
                if (command.config && command.config.name && command.config.usePrefix) {
                    allCommands.push(global.config.PREFIX + command.config.name);
                }
            });
            const commandsList = allCommands.sort().join("\n");
            api.sendMessage(global.getText("commands", "help", commandsList), event.threadID, event.messageID);
          };
        